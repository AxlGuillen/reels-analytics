import type { Video, VideoMetrics } from "@/core/domain";
import {
  hourOfDay,
  monthKey,
  monthLabel,
  weekday,
  weekdayIndex,
} from "@/core/lib/datetime";
import {
  classifyContentType,
  contentTypeLabel,
  type ContentTypeKey,
} from "@/core/lib/content-type";

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

/**
 * Hashtags ordenados por vistas totales acumuladas. `exclude` permite omitir tags
 * (p. ej. los identificadores de tipo) para que el ranking sea de hashtags temáticos.
 */
export function topHashtags(
  rows: VideoWithMetrics[],
  limit = 10,
  exclude: ReadonlySet<string> = new Set(),
): HashtagStat[] {
  const byTag = new Map<string, { count: number; totalViews: number }>();
  for (const { video, metrics } of rows) {
    for (const tag of video.hashtags) {
      if (exclude.has(tag)) continue;
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

export interface ContentTypeStat {
  key: ContentTypeKey | null;
  label: string;
  count: number;
  totalViews: number;
  avgViews: number;
  totalComments: number;
  avgEngagement: number;
}

/**
 * Agrupa por tipo de contenido (derivado de los hashtags, no persistido) y resume
 * cada grupo. Incluye "sin clasificar". Ordena por vistas promedio desc para ver
 * de un vistazo qué formato rinde más. Reusa `summarize`/`engagementRate`.
 */
export function groupByContentType(rows: VideoWithMetrics[]): ContentTypeStat[] {
  const groups = new Map<ContentTypeKey | null, VideoWithMetrics[]>();
  for (const row of rows) {
    const key = classifyContentType(row.video.hashtags);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([key, groupRows]) => {
      const s = summarize(groupRows);
      const totalComments = groupRows.reduce((sum, r) => sum + r.metrics.comments, 0);
      return {
        key,
        label: contentTypeLabel(key),
        count: s.totalVideos,
        totalViews: s.totalViews,
        avgViews: s.avgViews,
        totalComments,
        avgEngagement: s.avgEngagement,
      };
    })
    .sort((a, b) => b.avgViews - a.avgViews);
}

export interface MonthStat {
  month: string;
  label: string;
  count: number;
  totalViews: number;
  avgViews: number;
  totalComments: number;
  avgEngagement: number;
}

/**
 * Cohorte por **mes de publicación**: cómo rindió lo publicado cada mes. Usa las
 * métricas actuales del video (no deltas). Ordena del mes más reciente al más viejo.
 */
export function videosByPublishMonth(
  rows: VideoWithMetrics[],
  timeZone = CREATOR_TIMEZONE,
): MonthStat[] {
  const byMonth = new Map<string, VideoWithMetrics[]>();
  for (const row of rows) {
    const key = monthKey(row.video.publishedAt, timeZone);
    const list = byMonth.get(key) ?? [];
    list.push(row);
    byMonth.set(key, list);
  }

  return [...byMonth.entries()]
    .map(([month, monthRows]) => {
      const s = summarize(monthRows);
      const totalComments = monthRows.reduce((sum, r) => sum + r.metrics.comments, 0);
      return {
        month,
        label: monthLabel(month),
        count: s.totalVideos,
        totalViews: s.totalViews,
        avgViews: s.avgViews,
        totalComments,
        avgEngagement: s.avgEngagement,
      };
    })
    .sort((a, b) => (a.month < b.month ? 1 : -1));
}

export interface CadenceBucket {
  label: string;
  /** videos cuyo gap desde la publicación anterior cae en este bucket. */
  count: number;
  avgViews: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Impacto del **espaciado** entre publicaciones. Para cada plataforma ordena por
 * `publishedAt`, calcula el gap (días) desde el post anterior y agrupa en buckets
 * (mismo día / 1 día / 2–3 / 4+), promediando vistas. Responde si publicar más
 * seguido o más espaciado se asocia con mejor rendimiento. El primer video de cada
 * plataforma no tiene gap previo y se omite.
 */
export function postingCadence(rows: VideoWithMetrics[]): CadenceBucket[] {
  const buckets = [
    { label: "Mismo día", min: 0, max: 0 },
    { label: "1 día", min: 1, max: 1 },
    { label: "2–3 días", min: 2, max: 3 },
    { label: "4+ días", min: 4, max: Infinity },
  ];
  const sums = buckets.map(() => ({ views: 0, count: 0 }));

  const byPlatform = new Map<string, VideoWithMetrics[]>();
  for (const row of rows) {
    const list = byPlatform.get(row.video.platform) ?? [];
    list.push(row);
    byPlatform.set(row.video.platform, list);
  }

  for (const list of byPlatform.values()) {
    const sorted = [...list].sort(
      (a, b) => a.video.publishedAt.getTime() - b.video.publishedAt.getTime(),
    );
    for (let i = 1; i < sorted.length; i++) {
      const gapDays = Math.floor(
        (sorted[i].video.publishedAt.getTime() -
          sorted[i - 1].video.publishedAt.getTime()) /
          DAY_MS,
      );
      const bucketIndex = buckets.findIndex(
        (b) => gapDays >= b.min && gapDays <= b.max,
      );
      if (bucketIndex >= 0) {
        sums[bucketIndex].views += sorted[i].metrics.views;
        sums[bucketIndex].count += 1;
      }
    }
  }

  return buckets.map((b, i) => ({
    label: b.label,
    count: sums[i].count,
    avgViews: sums[i].count > 0 ? sums[i].views / sums[i].count : 0,
  }));
}
