import type {
  AccountStats,
  Connection,
  PlatformProvider,
  VideoMetrics,
  VideoPage,
} from "@/core/domain";
import { fetchMediaInsights, fetchMediaPage, fetchUserInfo } from "./api";
import { toAccountStats, toVideo, toVideoMetrics } from "./mappers";

/**
 * Adapter de Instagram — Graph API (Instagram API with Instagram Login).
 *
 * Implementa el puerto `PlatformProvider`. A diferencia de TikTok, las métricas
 * por Reel (views/shares/saved) viven en el endpoint de insights, así que
 * `getVideoMetrics` hace una llamada por Reel.
 */
export class InstagramProvider implements PlatformProvider {
  readonly platform = "instagram" as const;

  async getAccountStats(conn: Connection): Promise<AccountStats> {
    const user = await fetchUserInfo(conn.accessToken);
    return toAccountStats(user);
  }

  async listVideos(conn: Connection, cursor?: string): Promise<VideoPage> {
    const page = await fetchMediaPage(conn.accessToken, cursor);
    const reels = page.data.filter((m) => m.media_product_type === "REELS");
    return {
      videos: reels.map(toVideo),
      nextCursor: page.paging?.next ? (page.paging.cursors?.after ?? null) : null,
    };
  }

  async getVideoMetrics(
    conn: Connection,
    externalIds: string[],
  ): Promise<VideoMetrics[]> {
    return Promise.all(
      externalIds.map(async (id) => {
        const insights = await fetchMediaInsights(conn.accessToken, id);
        return toVideoMetrics({ id }, insights);
      }),
    );
  }
}

export const instagramProvider = new InstagramProvider();
