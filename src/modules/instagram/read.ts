import { env } from "@/core/config/env";
import type { AccountStats } from "@/core/domain";
import { mapConcurrent } from "@/core/lib/concurrency";
import type { VideoWithMetrics } from "@/modules/analytics/insights";
import {
  fetchMediaById,
  fetchMediaInsights,
  fetchMediaPage,
  fetchUserInfo,
} from "./api";
import { toAccountStats, toVideo, toVideoMetrics } from "./mappers";
import type { IgMedia } from "./types";

/**
 * Lecturas de alto nivel para la UI. Interino: usa el token manual de
 * `INSTAGRAM_ACCESS_TOKEN` (sin OAuth todavía) y lee de la API en cada render.
 * Cuando exista Supabase, esta capa leerá de los snapshots persistidos.
 *
 * A diferencia de TikTok, las métricas por Reel viven en insights → una llamada
 * por Reel. Para que el dashboard responda, se acota por rango (`since`), se
 * limita el total (`MAX_REELS`) y las llamadas de insights van en paralelo con
 * concurrencia acotada. El job de ingesta futuro procesará el set completo.
 */

/** Tope de seguridad de páginas de media (50 por página). */
const MAX_PAGES = 10;
/** Tope de Reels procesados en la lectura viva del dashboard. */
const DASHBOARD_MAX_REELS = 90;
/** Llamadas de insights simultáneas. */
const INSIGHTS_CONCURRENCY = 6;

export interface ReadOptions {
  since?: Date;
  /**
   * Tope de Reels a procesar. El dashboard usa el default (90) para responder
   * rápido; la ingesta pasa el suyo propio (su presupuesto es el rate limit de
   * IG, no la latencia del render).
   */
  maxReels?: number;
}

export interface InstagramOverview {
  account: AccountStats;
  videos: VideoWithMetrics[];
}

export type InstagramReadResult =
  | { status: "disconnected" }
  | { status: "error"; message: string }
  | { status: "ok"; overview: InstagramOverview };

/** Recorre las páginas de media quedándose solo con Reels dentro del rango. */
async function collectReels(
  accessToken: string,
  since?: Date,
  maxReels = DASHBOARD_MAX_REELS,
): Promise<IgMedia[]> {
  const cutoff = since?.getTime();
  const reels: IgMedia[] = [];
  let after: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, paging } = await fetchMediaPage(accessToken, after);

    let reachedCutoff = false;
    for (const media of data) {
      if (cutoff && new Date(media.timestamp).getTime() < cutoff) {
        reachedCutoff = true;
        continue;
      }
      if (media.media_product_type === "REELS") reels.push(media);
    }

    const next = paging?.cursors?.after;
    if (reachedCutoff || !paging?.next || !next || reels.length >= maxReels) break;
    after = next;
  }
  return reels.slice(0, maxReels);
}

/** Lee el overview a partir de un access token ya válido (lo usa la ingesta/cron). */
export async function readInstagramOverviewByToken(
  accessToken: string,
  { since, maxReels }: ReadOptions = {},
): Promise<InstagramOverview> {
  const capturedAt = new Date();
  const [user, reels] = await Promise.all([
    fetchUserInfo(accessToken),
    collectReels(accessToken, since, maxReels),
  ]);

  const videos = await mapConcurrent(reels, INSIGHTS_CONCURRENCY, async (media) => {
    try {
      const insights = await fetchMediaInsights(accessToken, media.id);
      return {
        video: toVideo(media),
        metrics: toVideoMetrics(media, insights, capturedAt),
      };
    } catch {
      // Insights puede fallar en Reels muy nuevos: cae al nodo media.
      return {
        video: toVideo(media),
        metrics: toVideoMetrics(media, {}, capturedAt),
      };
    }
  });

  return { account: toAccountStats(user, capturedAt), videos };
}

export async function readInstagramOverview(
  options: ReadOptions = {},
): Promise<InstagramReadResult> {
  const accessToken = env("INSTAGRAM_ACCESS_TOKEN");
  if (!accessToken) return { status: "disconnected" };

  try {
    return {
      status: "ok",
      overview: await readInstagramOverviewByToken(accessToken, options),
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "error desconocido",
    };
  }
}

export type InstagramVideoResult =
  | { status: "disconnected" }
  | { status: "error"; message: string }
  | { status: "ok"; row: VideoWithMetrics };

/** Métricas vigentes de un Reel concreto (nodo media + insights). */
export async function readInstagramVideo(
  mediaId: string,
): Promise<InstagramVideoResult> {
  const accessToken = env("INSTAGRAM_ACCESS_TOKEN");
  if (!accessToken) return { status: "disconnected" };

  try {
    const capturedAt = new Date();
    const media = await fetchMediaById(accessToken, mediaId);
    // Insights puede fallar en Reels muy nuevos: cae al nodo media.
    const insights = await fetchMediaInsights(accessToken, mediaId).catch(() => ({}));
    return {
      status: "ok",
      row: {
        video: toVideo(media),
        metrics: toVideoMetrics(media, insights, capturedAt),
      },
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "error desconocido",
    };
  }
}
