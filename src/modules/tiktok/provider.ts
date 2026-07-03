import type {
  AccountStats,
  Connection,
  PlatformProvider,
  VideoMetrics,
  VideoPage,
} from "@/core/domain";
import { fetchUserInfo, fetchVideoList, queryVideos } from "./api";
import { toAccountStats, toVideo, toVideoMetrics } from "./mappers";

/**
 * Adapter de TikTok — Display API (Login Kit).
 *
 * Implementa el puerto `PlatformProvider`: recibe una `Connection` con el access
 * token del usuario y devuelve siempre el modelo de dominio normalizado.
 *
 * Nota de diseño: `listVideos` devuelve solo metadatos (cambian poco) y
 * `getVideoMetrics` las métricas (se historizan). Aunque `/video/list` ya trae
 * ambas, mantenerlas separadas refleja el flujo real de ingesta: se descubre el
 * video una vez y luego se consultan sus métricas periódicamente.
 */
export class TikTokProvider implements PlatformProvider {
  readonly platform = "tiktok" as const;

  async getAccountStats(conn: Connection): Promise<AccountStats> {
    const user = await fetchUserInfo(conn.accessToken);
    return toAccountStats(user);
  }

  async listVideos(conn: Connection, cursor?: string): Promise<VideoPage> {
    const { videos, cursor: next, hasMore } = await fetchVideoList(
      conn.accessToken,
      cursor ? Number(cursor) : undefined,
    );
    return {
      videos: videos.map(toVideo),
      nextCursor: hasMore ? String(next) : null,
    };
  }

  async getVideoMetrics(
    conn: Connection,
    externalIds: string[],
  ): Promise<VideoMetrics[]> {
    const videos = await queryVideos(conn.accessToken, externalIds);
    return videos.map((video) => toVideoMetrics(video));
  }
}

export const tiktokProvider = new TikTokProvider();
