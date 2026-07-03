import type { Video, VideoMetrics } from "@/core/domain";
import { hourOfDay, weekday, weekdayIndex } from "@/core/lib/datetime";

/**
 * Analítica derivada del modelo de dominio. Es cross-platform: opera sobre
 * `Video` + `VideoMetrics`, sin conocer TikTok ni Instagram.
 */

export interface VideoWithMetrics {
  video: Video;
  metrics: VideoMetrics;
}

/**
 * Zona horaria del creador para agrupar por día/hora de publicación.
 * El servidor corre en UTC, así que sin esto "mejor hora" saldría desfasada.
 * Ajústala a la de tu público principal.
 */
export const CREATOR_TIMEZONE = "America/Mexico_City";

/** Tasa de interacción de un video: (likes + comentarios + compartidos) / vistas. */
export function engagementRate(metrics: VideoMetrics): number {
  if (metrics.views <= 0) return 0;
  return (metrics.likes + metrics.comments + metrics.shares) / metrics.views;
}

export interface Bucket {
  label: string;
  /** promedio de vistas de los videos publicados en este bucket. */
  avgViews: number;
  count: number;
}

function averageBuckets(
  size: number,
  labelFor: (index: number) => string,
  indexFor: (row: VideoWithMetrics) => number,
  rows: VideoWithMetrics[],
): Bucket[] {
  const sums = Array.from({ length: size }, () => ({ views: 0, count: 0 }));
  for (const row of rows) {
    const bucket = sums[indexFor(row)];
    bucket.views += row.metrics.views;
    bucket.count += 1;
  }
  return sums.map((b, i) => ({
    label: labelFor(i),
    avgViews: b.count > 0 ? b.views / b.count : 0,
    count: b.count,
  }));
}

/** Promedio de vistas por día de la semana (0 = domingo). */
export function viewsByWeekday(
  rows: VideoWithMetrics[],
  timeZone = CREATOR_TIMEZONE,
): Bucket[] {
  return averageBuckets(
    7,
    (i) => weekday(new Date(Date.UTC(2024, 0, 7 + i)), "UTC"),
    (row) => weekdayIndex(row.video.publishedAt, timeZone),
    rows,
  );
}

/** Promedio de vistas por hora de publicación (0-23). */
export function viewsByHour(
  rows: VideoWithMetrics[],
  timeZone = CREATOR_TIMEZONE,
): Bucket[] {
  return averageBuckets(
    24,
    (i) => `${i}:00`,
    (row) => hourOfDay(row.video.publishedAt, timeZone),
    rows,
  );
}

/** Bucket con mayor promedio de vistas (ignorando los vacíos). */
export function bestBucket(buckets: Bucket[]): Bucket | undefined {
  return buckets
    .filter((b) => b.count > 0)
    .reduce<Bucket | undefined>(
      (best, b) => (!best || b.avgViews > best.avgViews ? b : best),
      undefined,
    );
}

export interface HashtagStat {
  tag: string;
  count: number;
  totalViews: number;
  avgViews: number;
}

/** Hashtags ordenados por vistas totales acumuladas. */
export function topHashtags(
  rows: VideoWithMetrics[],
  limit = 10,
): HashtagStat[] {
  const byTag = new Map<string, { count: number; totalViews: number }>();
  for (const { video, metrics } of rows) {
    for (const tag of video.hashtags) {
      const entry = byTag.get(tag) ?? { count: 0, totalViews: 0 };
      entry.count += 1;
      entry.totalViews += metrics.views;
      byTag.set(tag, entry);
    }
  }
  return [...byTag.entries()]
    .map(([tag, e]) => ({
      tag,
      count: e.count,
      totalViews: e.totalViews,
      avgViews: e.totalViews / e.count,
    }))
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, limit);
}

export interface Summary {
  totalVideos: number;
  totalViews: number;
  avgViews: number;
  avgEngagement: number;
  bestVideo?: VideoWithMetrics;
}

/** Totales y promedios del conjunto de videos. */
export function summarize(rows: VideoWithMetrics[]): Summary {
  if (rows.length === 0) {
    return { totalVideos: 0, totalViews: 0, avgViews: 0, avgEngagement: 0 };
  }
  const totalViews = rows.reduce((sum, r) => sum + r.metrics.views, 0);
  const totalEngagement = rows.reduce((sum, r) => sum + engagementRate(r.metrics), 0);
  const bestVideo = rows.reduce((best, r) =>
    r.metrics.views > best.metrics.views ? r : best,
  );
  return {
    totalVideos: rows.length,
    totalViews,
    avgViews: totalViews / rows.length,
    avgEngagement: totalEngagement / rows.length,
    bestVideo,
  };
}
