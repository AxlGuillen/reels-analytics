import "server-only";
import { mapConcurrent } from "@/core/lib/concurrency";
import {
  getValidInstagramAccessToken,
  getValidTikTokAccessToken,
} from "@/modules/accounts/tokens";
import { fetchMediaInsights } from "@/modules/instagram/api";
import { readInstagramOverviewByToken } from "@/modules/instagram/read";
import { readTikTokOverviewByToken } from "@/modules/tiktok/read";
import {
  insertVideoSnapshots,
  listStaleVideos,
  persistOverview,
  type IngestResult,
  type VideoSnapshotRow,
} from "./persist";

/**
 * Captura un snapshot de una plataforma: resuelve un token válido desde
 * `ra_connections` (con refresh), lee el overview completo y lo persiste.
 * Al no depender de la cookie, funciona igual desde el botón o desde el cron.
 *
 * Presupuesto de Instagram (plan Hobby: 60 s por función; rate limit IG ~200
 * llamadas/usuario/hora en ventana rodante):
 *  - Franja reciente: Reels de los últimos RECENT_DAYS (1 insights c/u, tope
 *    RECENT_MAX_REELS) → metadatos frescos + snapshot.
 *  - Rotación: ROTATION_BATCH Reels viejos con el snapshot más antiguo (1 sola
 *    llamada de insights c/u; su metadata casi no cambia y no se relee) → todo
 *    el catálogo recibe snapshot al menos cada ~(catálogo/K) días.
 *  Peor caso ≈ 100 + ~5 + 50 ≈ 155 llamadas por corrida.
 */

const RECENT_DAYS = 30;
const RECENT_MAX_REELS = 100;
const ROTATION_BATCH = 50;
const ROTATION_CONCURRENCY = 5;

export async function captureTikTok(): Promise<IngestResult> {
  const token = await getValidTikTokAccessToken();
  if (!token) {
    throw new Error(
      "TikTok sin conexión persistida. Reconéctate una vez para guardarla.",
    );
  }
  // TikTok trae las métricas inline en /video/list: el catálogo completo son
  // ~10 llamadas, no necesita rotación.
  const overview = await readTikTokOverviewByToken(token);
  return persistOverview(overview.account, overview.videos);
}

export async function captureInstagram(): Promise<IngestResult> {
  const token = await getValidInstagramAccessToken();
  if (!token) {
    throw new Error("Instagram sin token válido (revisa INSTAGRAM_ACCESS_TOKEN).");
  }

  // 1. Franja reciente: overview completo (cuenta + Reels nuevos).
  const since = new Date(Date.now() - RECENT_DAYS * 86_400_000);
  const overview = await readInstagramOverviewByToken(token, {
    since,
    maxReels: RECENT_MAX_REELS,
  });
  const result = await persistOverview(overview.account, overview.videos);

  // 2. Rotación: snapshots de los Reels viejos más "olvidados".
  const justCaptured = new Set(overview.videos.map((v) => v.video.externalId));
  const stale = await listStaleVideos("instagram", ROTATION_BATCH, justCaptured);
  const capturedAt = new Date().toISOString();

  const rows = await mapConcurrent(
    stale,
    ROTATION_CONCURRENCY,
    async (video): Promise<VideoSnapshotRow | null> => {
      try {
        const insights = await fetchMediaInsights(token, video.external_id);
        return {
          video_id: video.id,
          captured_at: capturedAt,
          views: insights.views ?? 0,
          likes: insights.likes ?? 0,
          comments: insights.comments ?? 0,
          shares: insights.shares ?? 0,
          saved: insights.saved ?? null,
        };
      } catch {
        // Reel borrado o insights no disponible: se omite (insertar ceros
        // corrompería su curva de crecimiento).
        return null;
      }
    },
  );
  const rotated = await insertVideoSnapshots(
    rows.filter((r): r is VideoSnapshotRow => r !== null),
  );

  return { ...result, snapshots: result.snapshots + rotated };
}