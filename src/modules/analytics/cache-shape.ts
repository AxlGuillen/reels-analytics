import type { Video, VideoMetrics } from "@/core/domain";
import type { AccountSeries, GrowthData } from "./history";
import type { MonthGained, VideoWithMetrics } from "./insights";

/**
 * Forma serializable de lo que guarda el caché de analítica (`cached.ts`), y
 * cómo se compone. Pura y testeada.
 *
 * `unstable_cache` persiste en JSON: las `Date` volverían como strings en un
 * acierto pero como `Date` en un fallo. Para que el consumidor reciba SIEMPRE
 * la misma forma, lo cacheado se guarda ya serializado y se rehidrata al leer.
 */

export interface CachedVideo {
  video: Omit<Video, "publishedAt"> & { publishedAt: string };
  metrics: Omit<VideoMetrics, "capturedAt"> & { capturedAt: string };
}

export interface CachedGrowth {
  videos: CachedVideo[];
  accountSeries: AccountSeries[];
}

export function serializeGrowth({ videos, accountSeries }: GrowthData): CachedGrowth {
  return {
    videos: videos.map(({ video, metrics }) => ({
      video: { ...video, publishedAt: video.publishedAt.toISOString() },
      metrics: { ...metrics, capturedAt: metrics.capturedAt.toISOString() },
    })),
    accountSeries,
  };
}

export function reviveGrowth({ videos, accountSeries }: CachedGrowth): GrowthData {
  return {
    videos: videos.map(
      ({ video, metrics }): VideoWithMetrics => ({
        video: { ...video, publishedAt: new Date(video.publishedAt) },
        metrics: { ...metrics, capturedAt: new Date(metrics.capturedAt) },
      }),
    ),
    accountSeries,
  };
}

/**
 * "Todas las plataformas" = unión de las entradas por plataforma. El caché
 * solo guarda por plataforma: entradas chicas y una sola cosa que invalidar.
 */
export function mergeGrowth(parts: GrowthData[]): GrowthData {
  return {
    videos: parts.flatMap((p) => p.videos),
    accountSeries: parts.flatMap((p) => p.accountSeries),
  };
}

/** Suma por mes las ganancias de varias plataformas (orden cronológico). */
export function mergeMonthGained(parts: MonthGained[][]): MonthGained[] {
  const byMonth = new Map<string, MonthGained>();
  for (const m of parts.flat()) {
    const prev = byMonth.get(m.month);
    byMonth.set(m.month, prev ? { ...prev, gained: prev.gained + m.gained } : { ...m });
  }
  return [...byMonth.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}
