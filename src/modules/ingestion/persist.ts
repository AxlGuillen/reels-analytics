import "server-only";
import type { AccountStats, Platform } from "@/core/domain";
import { createAdminClient } from "@/core/supabase/admin";
import type { VideoWithMetrics } from "@/modules/analytics/insights";

/**
 * Persiste un overview (cuenta + videos con métricas) como un snapshot en el
 * tiempo. Estrategia:
 *  - upsert de cuenta y videos (por `platform + external_id`): metadatos frescos.
 *  - insert de snapshots (account + video): filas inmutables con `captured_at`.
 * El crecimiento sale de comparar snapshots; por eso los snapshots nunca se upsertean.
 */

export interface IngestResult {
  account: string;
  videos: number;
  snapshots: number;
}

export async function persistOverview(
  account: AccountStats,
  videos: VideoWithMetrics[],
): Promise<IngestResult> {
  const supabase = createAdminClient();
  const capturedAt = new Date().toISOString();
  const label = account.handle ?? account.externalId;

  // 1. Cuenta (upsert) → id interno
  const { data: acct, error: acctErr } = await supabase
    .from("ra_social_accounts")
    .upsert(
      {
        platform: account.platform,
        external_id: account.externalId,
        handle: account.handle,
        display_name: account.displayName ?? null,
        avatar_url: account.avatarUrl ?? null,
      },
      { onConflict: "platform,external_id" },
    )
    .select("id")
    .single();
  if (acctErr || !acct) {
    throw new Error(`ra_social_accounts: ${acctErr?.message ?? "sin id"}`);
  }
  const accountId = acct.id;

  // 2. Snapshot de cuenta
  const { error: accSnapErr } = await supabase.from("ra_account_snapshots").insert({
    account_id: accountId,
    captured_at: capturedAt,
    followers: account.followers,
    following: account.following ?? null,
    total_views: account.totalViews,
    total_likes: account.totalLikes,
    video_count: account.videoCount ?? null,
  });
  if (accSnapErr) throw new Error(`ra_account_snapshots: ${accSnapErr.message}`);

  if (videos.length === 0) {
    return { account: label, videos: 0, snapshots: 0 };
  }

  // 3. Videos (upsert) → mapa external_id → id
  const { data: vids, error: vidErr } = await supabase
    .from("ra_videos")
    .upsert(
      videos.map(({ video }) => ({
        account_id: accountId,
        platform: video.platform,
        external_id: video.externalId,
        caption: video.caption,
        hashtags: video.hashtags,
        published_at: video.publishedAt.toISOString(),
        url: video.url,
        duration_s: video.durationSeconds ?? null,
        thumbnail_url: video.thumbnailUrl ?? null,
      })),
      { onConflict: "platform,external_id" },
    )
    .select("id, external_id");
  if (vidErr || !vids) throw new Error(`ra_videos: ${vidErr?.message ?? "sin datos"}`);

  const idByExternal = new Map(vids.map((v) => [v.external_id, v.id]));

  // 4. Snapshots de video (insert)
  const snapshots = videos.flatMap(({ video, metrics }) => {
    const videoId = idByExternal.get(video.externalId);
    if (!videoId) return [];
    return [
      {
        video_id: videoId,
        captured_at: capturedAt,
        views: metrics.views,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        saved: metrics.saved,
      },
    ];
  });

  const { error: vidSnapErr } = await supabase
    .from("ra_video_snapshots")
    .insert(snapshots);
  if (vidSnapErr) throw new Error(`ra_video_snapshots: ${vidSnapErr.message}`);

  return { account: label, videos: vids.length, snapshots: snapshots.length };
}

// ------------------------------------------------- Rotación de videos viejos

export interface StaleVideoRef {
  /** id interno en ra_videos. */
  id: string;
  external_id: string;
}

/** Ventana para decidir "staleness": basta con cubrir varios ciclos de rotación. */
const STALE_WINDOW_DAYS = 14;

/**
 * Videos de la plataforma cuyo último snapshot es el más viejo (o no tienen
 * ninguno en la ventana), excluyendo los ya capturados en esta corrida. Es la
 * cola de la rotación diaria: con K por día, todo el catálogo recibe snapshot
 * al menos cada ~(catálogo/K) días sin exceder el rate limit.
 */
export async function listStaleVideos(
  platform: Platform,
  limit: number,
  excludeExternalIds: ReadonlySet<string>,
): Promise<StaleVideoRef[]> {
  const supabase = createAdminClient();

  const { data: vids, error: vidErr } = await supabase
    .from("ra_videos")
    .select("id, external_id")
    .eq("platform", platform);
  if (vidErr) throw new Error(`ra_videos: ${vidErr.message}`);
  const candidates = (vids ?? []).filter((v) => !excludeExternalIds.has(v.external_id));
  if (candidates.length === 0) return [];

  const sinceIso = new Date(
    Date.now() - STALE_WINDOW_DAYS * 86_400_000,
  ).toISOString();
  const { data: snaps, error: snapErr } = await supabase
    .from("ra_video_snapshots")
    .select("video_id, captured_at")
    .in("video_id", candidates.map((v) => v.id))
    .gte("captured_at", sinceIso);
  if (snapErr) throw new Error(`ra_video_snapshots: ${snapErr.message}`);

  const latestByVideo = new Map<string, number>();
  for (const s of snaps ?? []) {
    const t = Date.parse(s.captured_at);
    const prev = latestByVideo.get(s.video_id);
    if (!prev || t > prev) latestByVideo.set(s.video_id, t);
  }

  // Sin snapshot en la ventana (latest = 0) → primeros en la cola.
  return candidates
    .sort(
      (a, b) => (latestByVideo.get(a.id) ?? 0) - (latestByVideo.get(b.id) ?? 0),
    )
    .slice(0, limit);
}

export interface VideoSnapshotRow {
  video_id: string;
  captured_at: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saved: number | null;
}

/** Inserta snapshots sueltos (rotación): filas inmutables, nunca upsert. */
export async function insertVideoSnapshots(rows: VideoSnapshotRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = createAdminClient();
  const { error } = await supabase.from("ra_video_snapshots").insert(rows);
  if (error) throw new Error(`ra_video_snapshots (rotación): ${error.message}`);
  return rows.length;
}
