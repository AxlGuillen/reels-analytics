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
  /** promedio simple de tasas: cada video pesa igual (100 vistas = 100k vistas). */
  avgEngagement: number;
  /** interacciones totales / vistas totales: pesa por audiencia real. */
  weightedEngagement: number;
  bestVideo?: VideoWithMetrics;
}

/** Totales y promedios del conjunto de videos. */
export function summarize(rows: VideoWithMetrics[]): Summary {
  if (rows.length === 0) {
    return {
      totalVideos: 0,
      totalViews: 0,
      avgViews: 0,
      avgEngagement: 0,
      weightedEngagement: 0,
    };
  }
  const totalViews = rows.reduce((sum, r) => sum + r.metrics.views, 0);
  const totalEngagement = rows.reduce((sum, r) => sum + engagementRate(r.metrics), 0);
  const totalInteractions = rows.reduce(
    (sum, r) => sum + r.metrics.likes + r.metrics.comments + r.metrics.shares,
    0,
  );
  const bestVideo = rows.reduce((best, r) =>
    r.metrics.views > best.metrics.views ? r : best,
  );
  return {
    totalVideos: rows.length,
    totalViews,
    avgViews: totalViews / rows.length,
    avgEngagement: totalEngagement / rows.length,
    weightedEngagement: totalViews > 0 ? totalInteractions / totalViews : 0,
    bestVideo,
  };
}

/**
 * Vistas promedio por duración del video. Solo TikTok expone la duración
 * (IG no la da), así que los videos sin dato se omiten y se reporta cuántos.
 */
export function viewsByDuration(rows: VideoWithMetrics[]): Bucket[] {
  const buckets = [
    { label: "< 20 s", min: 0, max: 20 },
    { label: "20–40 s", min: 20, max: 40 },
    { label: "40–60 s", min: 40, max: 60 },
    { label: "60 s +", min: 60, max: Infinity },
  ];
  const sums = buckets.map(() => ({ views: 0, count: 0 }));
  for (const row of rows) {
    const d = row.video.durationSeconds;
    if (d == null) continue;
    const i = buckets.findIndex((b) => d >= b.min && d < b.max);
    if (i >= 0) {
      sums[i].views += row.metrics.views;
      sums[i].count += 1;
    }
  }
  return buckets.map((b, i) => ({
    label: b.label,
    avgViews: sums[i].count > 0 ? sums[i].views / sums[i].count : 0,
    count: sums[i].count,
  }));
}

/** Texto "real" del caption: lo que va antes del primer hashtag. */
function captionText(caption: string | null): string {
  if (!caption) return "";
  const hashIndex = caption.indexOf("#");
  return (hashIndex >= 0 ? caption.slice(0, hashIndex) : caption).trim();
}

const EMOJI_RE = /\p{Extended_Pictographic}/u;

/**
 * Rendimiento por características del caption (longitud del texto antes de los
 * hashtags, si pregunta, si lleva emoji). Señales baratas y a veces reveladoras;
 * correlación, no causalidad.
 */
export function captionStats(rows: VideoWithMetrics[]): Bucket[] {
  const groups: { label: string; match: (text: string) => boolean }[] = [
    { label: "Sin texto (solo hashtags)", match: (t) => t.length === 0 },
    { label: "Corto (≤ 50)", match: (t) => t.length > 0 && t.length <= 50 },
    { label: "Medio (51–150)", match: (t) => t.length > 50 && t.length <= 150 },
    { label: "Largo (150 +)", match: (t) => t.length > 150 },
    { label: "Con pregunta", match: (t) => t.includes("?") || t.includes("¿") },
    { label: "Con emoji", match: (t) => EMOJI_RE.test(t) },
  ];
  return groups.map((g) => {
    const matched = rows.filter((r) => g.match(captionText(r.video.caption)));
    const views = matched.reduce((sum, r) => sum + r.metrics.views, 0);
    return {
      label: g.label,
      avgViews: matched.length > 0 ? views / matched.length : 0,
      count: matched.length,
    };
  });
}

export interface MonthGained {
  month: string;
  label: string;
  /** vistas ganadas en el mes según los deltas entre snapshots consecutivos. */
  gained: number;
}

/**
 * Momentum del catálogo: vistas GANADAS por mes calendario, sumando el delta
 * entre snapshots consecutivos de cada video (atribuido al mes de la captura).
 * Responde "¿cuánto creció todo mi contenido este mes?" — distinto de
 * `videosByPublishMonth` ("¿cómo rindió lo publicado este mes?"). El primer
 * snapshot de un video no aporta delta (lo previo no se observó). Los deltas
 * negativos (correcciones de la plataforma) se suman tal cual.
 */
export function gainedByMonth(
  seriesList: { capturedAt: Date; views: number }[][],
  timeZone = CREATOR_TIMEZONE,
): MonthGained[] {
  const sums = new Map<string, number>();
  for (const series of seriesList) {
    const sorted = [...series].sort(
      (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
    );
    for (let i = 1; i < sorted.length; i++) {
      const key = monthKey(sorted[i].capturedAt, timeZone);
      const delta = sorted[i].views - sorted[i - 1].views;
      sums.set(key, (sums.get(key) ?? 0) + delta);
    }
  }
  return [...sums.entries()]
    .map(([month, gained]) => ({
      month,
      label: monthLabel(month),
      gained: Math.round(gained),
    }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
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
