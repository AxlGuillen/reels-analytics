import type { AccountStats, Video, VideoMetrics } from "@/core/domain";
import { extractHashtags } from "@/core/lib/hashtags";
import type { IgInsights, IgMedia, IgUser } from "./types";

/**
 * Convierte las respuestas crudas de Instagram al modelo de dominio normalizado.
 * Diferencias que se aplanan aquí:
 *  - IG no expone likes/views totales de cuenta → `null`.
 *  - views/shares/saved por Reel viven en insights, no en el nodo media.
 *  - la duración no viene en el nodo media → `null`.
 */

export function toAccountStats(
  user: IgUser,
  capturedAt = new Date(),
): AccountStats {
  return {
    platform: "instagram",
    externalId: user.user_id,
    handle: user.username || null,
    followers: user.followers_count ?? 0,
    totalViews: null,
    totalLikes: null,
    capturedAt,
    displayName: user.name || null,
    avatarUrl: user.profile_picture_url || null,
    bio: user.biography || null,
    following: user.follows_count ?? null,
    videoCount: user.media_count ?? null,
  };
}

export function toVideo(media: IgMedia): Video {
  return {
    platform: "instagram",
    externalId: media.id,
    caption: media.caption || null,
    hashtags: extractHashtags(media.caption),
    publishedAt: new Date(media.timestamp),
    url: media.permalink || null,
    durationSeconds: null,
    thumbnailUrl: media.thumbnail_url || null,
  };
}

export function toVideoMetrics(
  media: Pick<IgMedia, "id" | "like_count" | "comments_count">,
  insights: IgInsights,
  capturedAt = new Date(),
): VideoMetrics {
  return {
    platform: "instagram",
    externalId: media.id,
    views: insights.views ?? 0,
    // insights trae likes/comments, pero el nodo media es un fallback fiable.
    likes: insights.likes ?? media.like_count ?? 0,
    comments: insights.comments ?? media.comments_count ?? 0,
    shares: insights.shares ?? 0,
    saved: insights.saved ?? null,
    capturedAt,
  };
}
