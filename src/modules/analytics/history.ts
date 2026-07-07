import "server-only";
import type { Platform } from "@/core/domain";
import { createAdminClient } from "@/core/supabase/admin";
import type { VideoWithMetrics } from "./insights";

/**
 * Capa de lectura de la historia persistida en Supabase (`ra_*`). Es el primer
 * consumidor de los snapshots que guarda el cron; las páginas por plataforma
 * siguen leyendo en vivo de las APIs.
 *
 * Principio: Supabase guarda solo datos crudos. Aquí solo leemos y reconstruimos
 * el shape `VideoWithMetrics` que ya consume `insights.ts`; la clasificación por
 * tipo se deriva después, al analizar/renderizar.
 */

/** Ventana hacia atrás desde la última captura para hallar la métrica vigente por video. */
const LATEST_WINDOW_DAYS = 7;

export interface AccountPoint {
  capturedAt: string;
  followers: number | null;
  totalViews: number | null;
  totalLikes: number | null;
}

export interface AccountSeries {
  platform: Platform;
  handle: string | null;
  points: AccountPoint[];
}

export interface GrowthData {
  videos: VideoWithMetrics[];
  accountSeries: AccountSeries[];
}

export interface ReadGrowthOptions {
  platform?: Platform;
}

export async function readGrowth(
  { platform }: ReadGrowthOptions = {},
): Promise<GrowthData> {
  const supabase = createAdminClient();

  // 1. Cuentas (opcionalmente por plataforma) → metadata por id.
  let accountsQuery = supabase
    .from("ra_social_accounts")
    .select("id, platform, handle");
  if (platform) accountsQuery = accountsQuery.eq("platform", platform);
  const { data: accounts, error: accErr } = await accountsQuery;
  if (accErr) throw new Error(`ra_social_accounts: ${accErr.message}`);
  if (!accounts || accounts.length === 0) {
    return { videos: [], accountSeries: [] };
  }
  const accountIds = accounts.map((a) => a.id);

  // 2. Serie de crecimiento de cuenta (tabla chica: ~1-2 filas/día).
  const { data: accSnaps, error: accSnapErr } = await supabase
    .from("ra_account_snapshots")
    .select("account_id, captured_at, followers, total_views, total_likes")
    .in("account_id", accountIds)
    .order("captured_at", { ascending: true });
  if (accSnapErr) throw new Error(`ra_account_snapshots: ${accSnapErr.message}`);

  const seriesByAccount = new Map<string, AccountSeries>();
  for (const acc of accounts) {
    seriesByAccount.set(acc.id, {
      platform: acc.platform,
      handle: acc.handle,
      points: [],
    });
  }
  for (const snap of accSnaps ?? []) {
    seriesByAccount.get(snap.account_id)?.points.push({
      capturedAt: snap.captured_at,
      followers: snap.followers,
      totalViews: snap.total_views,
      totalLikes: snap.total_likes,
    });
  }

  // 3. Videos (metadata) de esas cuentas.
  const { data: videoRows, error: vidErr } = await supabase
    .from("ra_videos")
    .select(
      "id, platform, external_id, caption, hashtags, published_at, url, duration_s, thumbnail_url",
    )
    .in("account_id", accountIds);
  if (vidErr) throw new Error(`ra_videos: ${vidErr.message}`);
  if (!videoRows || videoRows.length === 0) {
    return { videos: [], accountSeries: [...seriesByAccount.values()] };
  }
  const videoIds = videoRows.map((v) => v.id);

  // 4. Métrica vigente por video: última captura, ventana hacia atrás, dedupe en TS.
  const { data: maxRow } = await supabase
    .from("ra_video_snapshots")
    .select("captured_at")
    .in("video_id", videoIds)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!maxRow) {
    return { videos: [], accountSeries: [...seriesByAccount.values()] };
  }
  const sinceIso = new Date(
    new Date(maxRow.captured_at).getTime() - LATEST_WINDOW_DAYS * 86_400_000,
  ).toISOString();

  const { data: recentSnaps, error: snapErr } = await supabase
    .from("ra_video_snapshots")
    .select("video_id, captured_at, views, likes, comments, shares, saved")
    .in("video_id", videoIds)
    .gte("captured_at", sinceIso)
    .order("captured_at", { ascending: false });
  if (snapErr) throw new Error(`ra_video_snapshots: ${snapErr.message}`);

  // Primera aparición por video = la más reciente (viene ordenado desc).
  const latestByVideo = new Map<string, (typeof recentSnaps)[number]>();
  for (const snap of recentSnaps ?? []) {
    if (!latestByVideo.has(snap.video_id)) latestByVideo.set(snap.video_id, snap);
  }

  // 5. Reconstruye VideoWithMetrics (omite videos sin snapshot reciente).
  const videos: VideoWithMetrics[] = [];
  for (const v of videoRows) {
    const snap = latestByVideo.get(v.id);
    if (!snap) continue;
    const capturedAt = new Date(snap.captured_at);
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
      },
      metrics: {
        platform: v.platform,
        externalId: v.external_id,
        views: snap.views,
        likes: snap.likes,
        comments: snap.comments,
        shares: snap.shares,
        saved: snap.saved,
        capturedAt,
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
  if (vidErr) throw new Error(`ra_videos: ${vidErr.message}`);
  const videoId = videos?.[0]?.id;
  if (!videoId) return [];

  const { data: snaps, error: snapErr } = await supabase
    .from("ra_video_snapshots")
    .select("captured_at, views, likes, comments, shares, saved")
    .eq("video_id", videoId)
    .order("captured_at", { ascending: true });
  if (snapErr) throw new Error(`ra_video_snapshots: ${snapErr.message}`);

  return (snaps ?? []).map((s) => ({
    capturedAt: s.captured_at,
    views: s.views,
    likes: s.likes,
    comments: s.comments,
    shares: s.shares,
    saved: s.saved,
  }));
}
