import type { AccountStats, Video, VideoMetrics } from "@/core/domain";
import { tiktokProvider } from "./provider";
import { isExpired, toConnection, type TikTokSession } from "./session";

/**
 * Lecturas de alto nivel para la UI. Orquesta el provider y combina metadatos
 * de video con sus métricas en filas listas para mostrar.
 *
 * Interino: lee del token en cookie. Cuando exista Supabase, esta capa leerá de
 * los snapshots persistidos en vez de llamar a la API en cada render.
 */

export interface VideoRow {
  video: Video;
  metrics: VideoMetrics | undefined;
}

export interface TikTokOverview {
  account: AccountStats;
  videos: VideoRow[];
}

/** Estado de la conexión para que la UI sepa qué renderizar. */
export type TikTokReadResult =
  | { status: "disconnected" }
  | { status: "expired" }
  | { status: "error"; message: string }
  | { status: "ok"; overview: TikTokOverview };

export async function readTikTokOverview(
  session: TikTokSession | null,
): Promise<TikTokReadResult> {
  if (!session) return { status: "disconnected" };
  if (isExpired(session)) return { status: "expired" };

  try {
    const conn = toConnection(session);
    const [account, page] = await Promise.all([
      tiktokProvider.getAccountStats(conn),
      tiktokProvider.listVideos(conn),
    ]);

    const ids = page.videos.map((video) => video.externalId);
    const metrics = await tiktokProvider.getVideoMetrics(conn, ids);
    const metricsById = new Map(metrics.map((m) => [m.externalId, m]));

    return {
      status: "ok",
      overview: {
        account,
        videos: page.videos.map((video) => ({
          video,
          metrics: metricsById.get(video.externalId),
        })),
      },
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "error desconocido",
    };
  }
}
