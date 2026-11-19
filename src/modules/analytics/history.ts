import "server-only";
import type { Platform } from "@/core/domain";
import { createAdminClient } from "@/core/supabase/admin";
import { supabaseError } from "@/core/supabase/errors";
import { fetchByIds } from "@/core/supabase/batched";
import type { VideoWithMetrics } from "./insights";
import { toAgePoints, type AgePoint } from "./timeseries";

/**
 * Capa de lectura de la historia persistida en Supabase (`ra_*`). Es el primer
 * consumidor de los snapshots que guarda el cron; las páginas por plataforma
 * siguen leyendo en vivo de las APIs.
 *
 * Principio: Supabase guarda solo datos crudos. Aquí solo leemos y reconstruimos
 * el shape `VideoWithMetrics` que ya consume `insights.ts`; la clasificación por
 * tipo se deriva después, al analizar/renderizar.
 */

export interface AccountPoint {
  capturedAt: string;
  followers: number | null;
  totalViews: number | null;
  totalLikes: number | null;
}

export interface AccountSeries {
  accountId: string;
  platform: Platform;
  handle: string | null;
  isPrimary: boolean;
  points: AccountPoint[];
}

export interface GrowthData {
  videos: VideoWithMetrics[];
  accountSeries: AccountSeries[];
}

/**
 * A qué cuentas se acota una lectura:
 *  - `"primary"`: la principal de cada plataforma (default de esta capa).
 *  - `"all"`: TODAS las cuentas, conectadas o no — la historia de una cuenta
 *    que perdió su conexión sigue contando en el reporte.
 *  - `{ accountId }`: una sola.
 *
 * Leer varias cuentas juntas es seguro mientras quien SUMA lo haga por cuenta:
 * los seguidores con `followerDeltasByDay`, los benchmarks con el cohorte de
 * cada cuenta (`breakouts.ts`) y el Overview con `aggregateAccounts`. Lo que no
 * se puede es aplanar las series de seguidores de varias cuentas: fabrica
 * deltas de miles (ver `followerDeltasByDay`).
 */
export type AccountScope = "primary" | "all" | { accountId: string };

export interface ReadGrowthOptions {
  platform?: Platform;
  account?: AccountScope;
}

export interface ScopedAccount {
  accountId: string;
  platform: Platform;
  handle: string | null;
  isPrimary: boolean;
}

type Supabase = ReturnType<typeof createAdminClient>;

async function scopedAccounts(
  supabase: Supabase,
  { platform, account = "primary" }: ReadGrowthOptions,
) {
  let query = supabase
    .from("ra_social_accounts")
    .select("id, platform, handle, is_primary");
  if (account === "primary") query = query.eq("is_primary", true);
  else if (account !== "all") query = query.eq("id", account.accountId);
  if (platform) query = query.eq("platform", platform);
  // Orden estable para el desglose: TikTok antes que Instagram (orden del
  // enum), la principal primero y luego por antigüedad.
  const { data, error } = await query
    .order("platform")
    .order("is_primary", { ascending: false })
    .order("created_at");
  if (error) throw supabaseError("ra_social_accounts", error);
  return data ?? [];
}

/** Cuentas dentro de un alcance, en orden de desglose (ver `scopedAccounts`). */
export async function resolveAccounts(
  options: ReadGrowthOptions = {},
): Promise<ScopedAccount[]> {
  const rows = await scopedAccounts(createAdminClient(), options);
  return rows.map((a) => ({
    accountId: a.id,
    platform: a.platform,
    handle: a.handle,
    isPrimary: a.is_primary,
  }));
}

/** Cuenta dueña de un video (null si aún no está en `ra_videos`). */
export async function readVideoOwner(
  platform: Platform,
  externalId: string,
): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("ra_videos")
    .select("account_id")
    .eq("platform", platform)
    .eq("external_id", externalId)
    .maybeSingle();
  if (error) throw supabaseError("ra_videos", error);
  return data?.account_id ?? null;
}

export async function readGrowth(
  options: ReadGrowthOptions = {},
): Promise<GrowthData> {
  const supabase = createAdminClient();

  // 1. Cuentas dentro del alcance → metadata por id.
  const accounts = await scopedAccounts(supabase, options);
  if (accounts.length === 0) {
    return { videos: [], accountSeries: [] };
  }
  const accountIds = accounts.map((a) => a.id);

  // 2. Serie de crecimiento de cuenta (tabla chica: ~1-2 filas/día).
  const accSnaps = await fetchByIds(
    "ra_account_snapshots",
    accountIds,
    (chunk, from, to) =>
      supabase
        .from("ra_account_snapshots")
        .select("account_id, captured_at, followers, total_views, total_likes")
        .in("account_id", chunk)
        .order("captured_at", { ascending: true })
        .order("id")
        .range(from, to),
  );

  const seriesByAccount = new Map<string, AccountSeries>();
  for (const acc of accounts) {
    seriesByAccount.set(acc.id, {
      accountId: acc.id,
      platform: acc.platform,
      handle: acc.handle,
      isPrimary: acc.is_primary,
      points: [],
    });
  }
  for (const snap of accSnaps) {
    seriesByAccount.get(snap.account_id)?.points.push({
      capturedAt: snap.captured_at,
      followers: snap.followers,
      totalViews: snap.total_views,
      totalLikes: snap.total_likes,
    });
  }

  // 3. Videos (metadata) de esas cuentas.
  const videoRows = await fetchByIds("ra_videos", accountIds, (chunk, from, to) =>
    supabase
      .from("ra_videos")
      .select(
        "id, account_id, platform, external_id, caption, hashtags, published_at, url, duration_s, thumbnail_url",
      )
      .in("account_id", chunk)
      .order("id")
      .range(from, to),
  );
  if (videoRows.length === 0) {
    return { videos: [], accountSeries: [...seriesByAccount.values()] };
  }
  const videoIds = videoRows.map((v) => v.id);

  // 4. Métrica vigente de CADA video = su último snapshot, tenga la antigüedad
  //    que tenga (vista `ra_video_latest_snapshot`, una fila por video).
  //
  //    Antes había una ventana de 7 días desde la última captura y todo video
  //    sin snapshot dentro quedaba fuera. Como el cron solo pide los 400 videos
  //    más recientes por cuenta (los viejos casi no cambian), los más antiguos
  //    dejaban de recibir snapshots y DESAPARECÍAN de los totales: en
  //    @axelsine13 faltaban 92 videos y 751.700 vistas (13 %). Ahora cuentan
  //    con su última métrica conocida.
  const latest = await fetchByIds(
    "ra_video_latest_snapshot",
    videoIds,
    (chunk, from, to) =>
      supabase
        .from("ra_video_latest_snapshot")
        .select("video_id, captured_at, views, likes, comments, shares, saved")
        .in("video_id", chunk)
        .order("video_id")
        .range(from, to),
  );
  const latestByVideo = new Map(latest.map((snap) => [snap.video_id, snap]));

  // 5. Reconstruye VideoWithMetrics. Solo se omite un video que nunca tuvo
  //    snapshot (dado de alta pero sin captura todavía).
  const videos: VideoWithMetrics[] = [];
  for (const v of videoRows) {
    const snap = latestByVideo.get(v.id);
    // Las columnas de una vista llegan tipadas como opcionales aunque el
    // `cross join lateral` garantiza valor: el `captured_at` nulo es imposible.
    if (!snap?.captured_at) continue;
    videos.push({
      video: {
        platform: v.platform,
        externalId: v.external_id,
        caption: v.caption,
        hashtags: v.hashtags,
        publishedAt: new Date(v.published_at),
        url: v.url,
        durationSeconds: v.duration_s,
        thumbnailUrl: v.thumbnail_url,
        accountId: v.account_id,
      },
      metrics: {
        platform: v.platform,
        externalId: v.external_id,
        views: snap.views ?? 0,
        likes: snap.likes ?? 0,
        comments: snap.comments ?? 0,
        shares: snap.shares ?? 0,
        saved: snap.saved,
        capturedAt: new Date(snap.captured_at),
      },
    });
  }

  return { videos, accountSeries: [...seriesByAccount.values()] };
}

export interface VideoHistoryPoint {
  capturedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saved: number | null;
}

/**
 * Serie temporal COMPLETA de un video (todos sus snapshots, orden cronológico).
 * Es el insumo para graficar el crecimiento de un video restando capturas.
 * Devuelve `[]` si el video aún no se ha ingerido a `ra_videos`.
 */
export async function readVideoHistory(
  platform: Platform,
  externalId: string,
): Promise<VideoHistoryPoint[]> {
  const supabase = createAdminClient();

  const { data: videos, error: vidErr } = await supabase
    .from("ra_videos")
    .select("id")
    .eq("platform", platform)
    .eq("external_id", externalId)
    .limit(1);
  if (vidErr) throw supabaseError("ra_videos", vidErr);
  const videoId = videos?.[0]?.id;
  if (!videoId) return [];

  const { data: snaps, error: snapErr } = await supabase
    .from("ra_video_snapshots")
    .select("captured_at, views, likes, comments, shares, saved")
    .eq("video_id", videoId)
    .order("captured_at", { ascending: true });
  if (snapErr) throw supabaseError("ra_video_snapshots", snapErr);

  return (snaps ?? []).map((s) => ({
    capturedAt: s.captured_at,
    views: s.views,
    likes: s.likes,
    comments: s.comments,
    shares: s.shares,
    saved: s.saved,
  }));
}

export interface VideoSeries {
  externalId: string;
  platform: Platform;
  /** cuenta dueña: el cohorte de un video se arma SOLO con su cuenta. */
  accountId: string;
  /** Fecha de publicación: la necesita el cohorte semanal (ver `weeklyCohort`). */
  publishedAt: Date;
  points: AgePoint[];
}

/** Solo consideramos videos recientes: la edad-N solo aplica a los que tienen
 *  historia temprana (publicados tras arrancar la ingesta). */
const SERIES_PUBLISHED_WITHIN_DAYS = 120;

/** Trae TODOS los snapshots de un set de videos (por lotes y paginado; ver
 *  `fetchByIds`). Dentro de cada video quedan en orden cronológico. */
function fetchAllVideoSnapshots(
  supabase: ReturnType<typeof createAdminClient>,
  videoIds: string[],
) {
  return fetchByIds("ra_video_snapshots", videoIds, (chunk, from, to) =>
    supabase
      .from("ra_video_snapshots")
      .select("video_id, captured_at, views, likes, comments, shares")
      .in("video_id", chunk)
      .order("captured_at", { ascending: true })
      .order("id")
      .range(from, to),
  );
}

/**
 * Serie por edad de cada video reciente, para calcular métricas normalizadas
 * (vistas a N días, velocidad inicial) sobre el conjunto. Es más pesada que
 * `readGrowth` (trae toda la historia), por eso se acota a videos recientes.
 */
export async function readVideoSeries(
  options: ReadGrowthOptions = {},
): Promise<VideoSeries[]> {
  const supabase = createAdminClient();
  const cutoff = new Date(
    Date.now() - SERIES_PUBLISHED_WITHIN_DAYS * 86_400_000,
  ).toISOString();

  const accountIds = (await scopedAccounts(supabase, options)).map((a) => a.id);
  if (accountIds.length === 0) return [];
  const videos = await fetchByIds("ra_videos", accountIds, (chunk, from, to) =>
    supabase
      .from("ra_videos")
      .select("id, account_id, external_id, platform, published_at")
      .in("account_id", chunk)
      .gte("published_at", cutoff)
      .order("id")
      .range(from, to),
  );
  if (videos.length === 0) return [];

  const snaps = await fetchAllVideoSnapshots(
    supabase,
    videos.map((v) => v.id),
  );
  const byVideo = new Map<string, { capturedAt: Date; views: number }[]>();
  for (const s of snaps) {
    const list = byVideo.get(s.video_id) ?? [];
    list.push({ capturedAt: new Date(s.captured_at), views: s.views });
    byVideo.set(s.video_id, list);
  }

  return videos.map((v) => ({
    externalId: v.external_id,
    platform: v.platform,
    accountId: v.account_id,
    publishedAt: new Date(v.published_at),
    points: toAgePoints(new Date(v.published_at), byVideo.get(v.id) ?? []),
  }));
}

export interface CalendarSnapshot {
  capturedAt: Date;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

/**
 * Series calendario (capturedAt + métricas) de TODOS los videos de las cuentas
 * del alcance (por defecto, la principal), para momentum y timelines. A diferencia de `readVideoSeries`,
 * no filtra por fecha de publicación: los deltas de los videos viejos
 * (rotación) también cuentan.
 */
export async function readSnapshotSeries(
  options: ReadGrowthOptions = {},
): Promise<CalendarSnapshot[][]> {
  const supabase = createAdminClient();

  const accountIds = (await scopedAccounts(supabase, options)).map((a) => a.id);
  if (accountIds.length === 0) return [];
  const videos = await fetchByIds("ra_videos", accountIds, (chunk, from, to) =>
    supabase
      .from("ra_videos")
      .select("id")
      .in("account_id", chunk)
      .order("id")
      .range(from, to),
  );
  if (videos.length === 0) return [];

  const snaps = await fetchAllVideoSnapshots(
    supabase,
    videos.map((v) => v.id),
  );
  const byVideo = new Map<string, CalendarSnapshot[]>();
  for (const s of snaps) {
    const list = byVideo.get(s.video_id) ?? [];
    list.push({
      capturedAt: new Date(s.captured_at),
      views: s.views,
      likes: s.likes,
      comments: s.comments,
      shares: s.shares,
    });
    byVideo.set(s.video_id, list);
  }
  return [...byVideo.values()];
}
