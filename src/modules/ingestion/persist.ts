import "server-only";
import type { AccountStats } from "@/core/domain";
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
