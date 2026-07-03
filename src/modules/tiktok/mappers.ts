import type { AccountStats, Video, VideoMetrics } from "@/core/domain";
import { extractHashtags } from "@/core/lib/hashtags";
import type { TikTokUser, TikTokVideo } from "./types";

/**
 * Convierte las respuestas crudas de TikTok al modelo de dominio normalizado.
 * Aquí es donde se "aplanan" las diferencias de la plataforma:
 * TikTok no expone vistas totales de cuenta ni guardados por video → `null`.
 */

export function toAccountStats(
  user: TikTokUser,
  capturedAt = new Date(),
): AccountStats {
  return {
    platform: "tiktok",
    externalId: user.open_id,
    handle: user.username || null,
    followers: user.follower_count,
    totalViews: null,
    totalLikes: user.likes_count,
    capturedAt,
    displayName: user.display_name || null,
    avatarUrl: user.avatar_url || null,
    verified: user.is_verified,
    bio: user.bio_description || null,
    following: user.following_count,
    videoCount: user.video_count,
  };
}

export function toVideo(video: TikTokVideo): Video {
  return {
    platform: "tiktok",
    externalId: video.id,
    caption: video.video_description || null,
    hashtags: extractHashtags(video.video_description),
    publishedAt: new Date(video.create_time * 1000),
    url: video.share_url || null,
    durationSeconds: video.duration ?? null,
    thumbnailUrl: video.cover_image_url || null,
  };
}

export function toVideoMetrics(
  video: TikTokVideo,
  capturedAt = new Date(),
): VideoMetrics {
  return {
    platform: "tiktok",
    externalId: video.id,
    views: video.view_count,
    likes: video.like_count,
    comments: video.comment_count,
    shares: video.share_count,
    saved: null,
    capturedAt,
  };
}
