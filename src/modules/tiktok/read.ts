import type { AccountStats } from "@/core/domain";
import type { VideoWithMetrics } from "@/modules/analytics/insights";
import { fetchUserInfo, fetchVideoList } from "./api";
import { toAccountStats, toVideo, toVideoMetrics } from "./mappers";
import { isExpired, type TikTokSession } from "./session";

/**
 * Lecturas de alto nivel para la UI. Combina metadatos de video con sus métricas
 * (TikTok las devuelve juntas en `/video/list`) y pagina hasta traer todo.
 *
 * Interino: lee de la API en cada render vía el token en cookie. Cuando exista
 * Supabase, esta capa leerá de los snapshots persistidos.
 */

/** Tope de seguridad: hasta ~200 videos (10 páginas de 20). */
const MAX_PAGES = 10;

export interface TikTokOverview {
  account: AccountStats;
  videos: VideoWithMetrics[];
}

export type TikTokReadResult =
  | { status: "disconnected" }
  | { status: "expired" }
  | { status: "error"; message: string }
  | { status: "ok"; overview: TikTokOverview };

/** Recorre todas las páginas de `/video/list` siguiendo el cursor. */
async function fetchAllVideos(accessToken: string): Promise<VideoWithMetrics[]> {
  const capturedAt = new Date();
  const rows: VideoWithMetrics[] = [];
  let cursor: number | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const { videos, cursor: next, hasMore } = await fetchVideoList(accessToken, cursor);
    for (const raw of videos) {
      rows.push({ video: toVideo(raw), metrics: toVideoMetrics(raw, capturedAt) });
    }
    if (!hasMore || videos.length === 0) break;
    cursor = next;
  }
  return rows;
}

export async function readTikTokOverview(
  session: TikTokSession | null,
): Promise<TikTokReadResult> {
  if (!session) return { status: "disconnected" };
  if (isExpired(session)) return { status: "expired" };

  try {
    const [user, videos] = await Promise.all([
      fetchUserInfo(session.accessToken),
      fetchAllVideos(session.accessToken),
    ]);
    return {
      status: "ok",
      overview: { account: toAccountStats(user), videos },
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "error desconocido",
    };
  }
}
