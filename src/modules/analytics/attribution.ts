import type { Platform } from "@/core/domain";
import { dayKey } from "@/core/lib/datetime";
import { CREATOR_TIMEZONE, type VideoWithMetrics } from "./insights";

/**
 * Atribución de seguidores: cruza los deltas diarios de seguidores de la cuenta
 * con las fechas de publicación. Es **correlación, no causalidad** — el delta de
 * la cuenta es global (lo mueve todo el catálogo, no solo el video nuevo); aun
 * así, los picos que coinciden con una publicación son la mejor pista disponible.
 */

const DAY_MS = 86_400_000;

/** Ventana de atribución: día de publicación + día siguiente. */
export const ATTRIBUTION_WINDOW_DAYS = 2;

export interface FollowerDelta {
  /** día `YYYY-MM-DD` (zona del creador) al que se atribuye el delta. */
  day: string;
  delta: number;
  /** días que abarca el delta (>1 si hubo huecos de ingesta). */
  spanDays: number;
}

/**
 * Deltas de seguidores entre días observados. Toma la última captura de cada
 * día (puede haber varias: cron + botón) y resta contra el día observado
 * anterior; si hubo hueco, `spanDays` lo delata en vez de repartir a ciegas.
 */
export function dailyFollowerDeltas(
  points: { capturedAt: Date; followers: number | null }[],
  timeZone = CREATOR_TIMEZONE,
): FollowerDelta[] {
  const byDay = new Map<string, { t: number; followers: number }>();
  for (const p of points) {
    if (p.followers === null) continue;
    const key = dayKey(p.capturedAt, timeZone);
    const prev = byDay.get(key);
    if (!prev || p.capturedAt.getTime() > prev.t) {
      byDay.set(key, { t: p.capturedAt.getTime(), followers: p.followers });
    }
  }

  const days = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  const deltas: FollowerDelta[] = [];
  for (let i = 1; i < days.length; i++) {
    const [day, current] = days[i];
    const [prevDay, previous] = days[i - 1];
    deltas.push({
      day,
      delta: current.followers - previous.followers,
      // Las claves YYYY-MM-DD se parsean como UTC: la resta da días calendario.
      spanDays: Math.round((Date.parse(day) - Date.parse(prevDay)) / DAY_MS),
    });
  }
  return deltas;
}

export interface AttributedVideo {
  row: VideoWithMetrics;
  /** seguidores ganados por la cuenta en la ventana del video. */
  gained: number;
  /** true si otro video de la misma plataforma comparte la ventana. */
  sharedWindow: boolean;
}

/**
 * Seguidores ganados en la ventana de cada video (publicación + día siguiente).
 * Los videos sin deltas observados en su ventana se omiten (no se inventa dato);
 * si varios videos comparten ventana, se marca — el crédito es de todos ellos.
 */
export function attributeFollowers(
  videos: VideoWithMetrics[],
  deltasByPlatform: ReadonlyMap<Platform, FollowerDelta[]>,
  timeZone = CREATOR_TIMEZONE,
  windowDays = ATTRIBUTION_WINDOW_DAYS,
): AttributedVideo[] {
  const windows = videos.map((row) => {
    const days = new Set<string>();
    for (let d = 0; d < windowDays; d++) {
      days.add(
        dayKey(new Date(row.video.publishedAt.getTime() + d * DAY_MS), timeZone),
      );
    }
    return { row, days };
  });

  const results: AttributedVideo[] = [];
  for (const w of windows) {
    const deltas = deltasByPlatform.get(w.row.video.platform) ?? [];
    const inWindow = deltas.filter((d) => w.days.has(d.day));
    if (inWindow.length === 0) continue;
    results.push({
      row: w.row,
      gained: inWindow.reduce((sum, d) => sum + d.delta, 0),
      sharedWindow: windows.some(
        (o) =>
          o !== w &&
          o.row.video.platform === w.row.video.platform &&
          [...o.days].some((d) => w.days.has(d)),
      ),
    });
  }
  return results.sort((a, b) => b.gained - a.gained);
}
