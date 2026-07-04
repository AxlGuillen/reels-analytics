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

/** Tope de seguridad: hasta ~400 videos (20 páginas de 20). */
const MAX_PAGES = 20;

export interface ReadOptions {
  /** solo videos publicados en o después de esta fecha (undefined = todos). */
  since?: Date;
}

export interface TikTokOverview {
  account: AccountStats;
  videos: VideoWithMetrics[];
}

export type TikTokReadResult =
  | { status: "disconnected" }
  | { status: "expired" }
  | { status: "error"; message: string }
  | { status: "ok"; overview: TikTokOverview };

/**
 * Recorre las páginas de `/video/list` siguiendo el cursor. Como vienen en orden
 * cronológico inverso, si hay `since` se corta al llegar a videos más antiguos
 * (así el rango por defecto hace pocas llamadas y evita el rate limit).
 */
async function fetchAllVideos(
  accessToken: string,
  since?: Date,
): Promise<VideoWithMetrics[]> {
  const capturedAt = new Date();
  const cutoff = since?.getTime();
  const rows: VideoWithMetrics[] = [];
  let cursor: number | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const { videos, cursor: next, hasMore } = await fetchVideoList(accessToken, cursor);
    for (const raw of videos) {
      if (cutoff && raw.create_time * 1000 < cutoff) continue;
      rows.push({ video: toVideo(raw), metrics: toVideoMetrics(raw, capturedAt) });
    }

    const oldest = videos.at(-1);
    const reachedCutoff = cutoff && oldest && oldest.create_time * 1000 < cutoff;
    if (!hasMore || videos.length === 0 || reachedCutoff) break;
    cursor = next;
  }
  return rows;
}

/** Lee el overview a partir de un access token ya válido (lo usa la ingesta/cron). */
export async function readTikTokOverviewByToken(
  accessToken: string,
  { since }: ReadOptions = {},
): Promise<TikTokOverview> {
  const [user, videos] = await Promise.all([
    fetchUserInfo(accessToken),
    fetchAllVideos(accessToken, since),
  ]);
  return { account: toAccountStats(user), videos };
}

export async function readTikTokOverview(
  session: TikTokSession | null,
  options: ReadOptions = {},
): Promise<TikTokReadResult> {
  if (!session) return { status: "disconnected" };
  if (isExpired(session)) return { status: "expired" };

  try {
    return { status: "ok", overview: await readTikTokOverviewByToken(session.accessToken, options) };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "error desconocido",
    };
  }
}
