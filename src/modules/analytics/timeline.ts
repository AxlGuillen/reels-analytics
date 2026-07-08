import { dayKey, monthKey, weekKey } from "@/core/lib/datetime";
import { CREATOR_TIMEZONE } from "./insights";

/**
 * Línea de tiempo de actividad: agrupa por día/semana/mes lo publicado, las
 * métricas GANADAS (deltas entre snapshots consecutivos, atribuidas al periodo
 * de la captura posterior) y los seguidores ganados. Pura y testeable; los
 * datos existen desde que arrancó la ingesta — no se inventa historia previa.
 */

export type Granularity = "day" | "week" | "month";

export interface SnapshotPoint {
  capturedAt: Date;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface TimelineBucket {
  /** clave del periodo: YYYY-MM-DD (día / lunes de la semana) o YYYY-MM. */
  bucket: string;
  videosPublished: number;
  viewsGained: number;
  likesGained: number;
  commentsGained: number;
  sharesGained: number;
  /** null = sin observaciones de seguidores en el periodo (≠ 0). */
  followersGained: number | null;
}

export function bucketKeyFor(
  granularity: Granularity,
  timeZone = CREATOR_TIMEZONE,
): (date: Date) => string {
  if (granularity === "day") return (d) => dayKey(d, timeZone);
  if (granularity === "week") return (d) => weekKey(d, timeZone);
  return (d) => monthKey(d, timeZone);
}

/** Re-agrupa una clave de día (ya calendario del creador) a su bucket. */
function rebucketDay(day: string, granularity: Granularity): string {
  if (granularity === "day") return day;
  // El día ya es calendario local; se re-agrupa en UTC para no desplazarlo.
  const noon = new Date(`${day}T12:00:00Z`);
  return granularity === "week" ? weekKey(noon, "UTC") : monthKey(noon, "UTC");
}

export function buildTimeline(
  input: {
    /** fechas de publicación de los videos del alcance. */
    publishedAt: Date[];
    /** series de snapshots por video (para los deltas de métricas). */
    snapshotSeries: SnapshotPoint[][];
    /** deltas diarios de seguidores ya calculados (clave de día del creador). */
    followerDeltas: { day: string; delta: number }[];
  },
  granularity: Granularity,
  timeZone = CREATOR_TIMEZONE,
): TimelineBucket[] {
  const keyFor = bucketKeyFor(granularity, timeZone);

  const published = new Map<string, number>();
  for (const date of input.publishedAt) {
    const key = keyFor(date);
    published.set(key, (published.get(key) ?? 0) + 1);
  }

  const gains = new Map<
    string,
    { views: number; likes: number; comments: number; shares: number }
  >();
  for (const series of input.snapshotSeries) {
    const sorted = [...series].sort(
      (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
    );
    for (let i = 1; i < sorted.length; i++) {
      const key = keyFor(sorted[i].capturedAt);
      const g = gains.get(key) ?? { views: 0, likes: 0, comments: 0, shares: 0 };
      g.views += sorted[i].views - sorted[i - 1].views;
      g.likes += sorted[i].likes - sorted[i - 1].likes;
      g.comments += sorted[i].comments - sorted[i - 1].comments;
      g.shares += sorted[i].shares - sorted[i - 1].shares;
      gains.set(key, g);
    }
  }

  const followers = new Map<string, number>();
  for (const d of input.followerDeltas) {
    const key = rebucketDay(d.day, granularity);
    followers.set(key, (followers.get(key) ?? 0) + d.delta);
  }

  const keys = new Set([
    ...published.keys(),
    ...gains.keys(),
    ...followers.keys(),
  ]);
  return [...keys]
    .sort()
    .map((bucket) => {
      const g = gains.get(bucket);
      return {
        bucket,
        videosPublished: published.get(bucket) ?? 0,
        viewsGained: g?.views ?? 0,
        likesGained: g?.likes ?? 0,
        commentsGained: g?.comments ?? 0,
        sharesGained: g?.shares ?? 0,
        followersGained: followers.get(bucket) ?? null,
      };
    });
}
