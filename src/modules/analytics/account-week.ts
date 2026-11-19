import { dayKey } from "@/core/lib/datetime";
import { followerDeltasByDay } from "./attribution";
import type { AccountSeries, CalendarSnapshot } from "./history";
import { CREATOR_TIMEZONE, type VideoWithMetrics } from "./insights";
import { buildTimeline } from "./timeline";

/**
 * La semana de una o varias cuentas, para el digest. Puro y testeado.
 *
 * Reusa a propósito las mismas piezas que el Overview (`buildTimeline` para los
 * deltas, `followerDeltasByDay` para los seguidores): medida con otra cuenta,
 * la semana no sería comparable con lo que muestra el panel. Con varias
 * cuentas, los seguidores se calculan por cuenta y luego se suman.
 */

export interface AccountWeek {
  /** Última lectura de seguidores (null si la cuenta nunca se capturó). */
  followers: number | null;
  /** Seguidores ganados en la semana; null si no hubo dos lecturas. */
  followersGained: number | null;
  published: number;
  viewsGained: number;
  /** Vistas promedio de lo publicado en la semana (null si no publicó). */
  avgViewsPublished: number | null;
  best: { caption: string | null; externalId: string; views: number } | null;
}

/** Lo publicado dentro de los días de la semana (calendario del creador). */
export function publishedInWeek(
  videos: VideoWithMetrics[],
  weekDays: ReadonlySet<string>,
  timeZone = CREATOR_TIMEZONE,
): VideoWithMetrics[] {
  return videos.filter((r) => weekDays.has(dayKey(r.video.publishedAt, timeZone)));
}

/**
 * Vistas promedio por video publicado en la semana. Es LA métrica de
 * comparación entre cuentas: los totales dependen de cuántos seguidores tiene
 * cada una (una cuenta nueva siempre pierde), el promedio por video publicado
 * esa misma semana compara contenido contra contenido.
 */
export function avgViewsOfPublished(
  videos: VideoWithMetrics[],
  weekDays: ReadonlySet<string>,
  timeZone = CREATOR_TIMEZONE,
): number | null {
  const week = publishedInWeek(videos, weekDays, timeZone);
  if (week.length === 0) return null;
  return Math.round(week.reduce((n, r) => n + r.metrics.views, 0) / week.length);
}

export function summarizeAccountWeek(
  input: {
    videos: VideoWithMetrics[];
    snapshotSeries: CalendarSnapshot[][];
    accountSeries: AccountSeries[];
  },
  weekDays: ReadonlySet<string>,
  timeZone = CREATOR_TIMEZONE,
): AccountWeek {
  const timeline = buildTimeline(
    {
      publishedAt: input.videos.map((r) => r.video.publishedAt),
      snapshotSeries: input.snapshotSeries,
      followerDeltas: followerDeltasByDay(input.accountSeries, timeZone),
    },
    "day",
    timeZone,
  );

  let viewsGained = 0;
  let followersGained: number | null = null;
  for (const bucket of timeline) {
    if (!weekDays.has(bucket.bucket)) continue;
    viewsGained += bucket.viewsGained;
    if (bucket.followersGained !== null) {
      followersGained = (followersGained ?? 0) + bucket.followersGained;
    }
  }

  // Seguidores actuales = la última lectura de CADA cuenta, sumadas (null si
  // ninguna se ha capturado). La última lectura "global" sería la de una sola.
  const lastPerAccount = input.accountSeries
    .map(
      (s) =>
        [...s.points]
          .filter((p) => p.followers !== null)
          .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt))
          .at(-1)?.followers ?? null,
    )
    .filter((f): f is number => f !== null);
  const lastFollowers = lastPerAccount.length
    ? lastPerAccount.reduce((a, b) => a + b, 0)
    : null;

  const week = publishedInWeek(input.videos, weekDays, timeZone);
  const top = [...week].sort((a, b) => b.metrics.views - a.metrics.views)[0];

  return {
    followers: lastFollowers,
    followersGained,
    published: week.length,
    viewsGained,
    avgViewsPublished: avgViewsOfPublished(input.videos, weekDays, timeZone),
    best: top
      ? {
          caption: top.video.caption,
          externalId: top.video.externalId,
          views: top.metrics.views,
        }
      : null,
  };
}
