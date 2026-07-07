import "server-only";
import type { Platform } from "@/core/domain";
import { readVideoSeries } from "./history";
import {
  benchmarkAgainstCohort,
  isBreakout,
  medianCurve,
  type AgePoint,
  type BenchmarkResult,
} from "./timeseries";

/**
 * Breakouts y benchmark contra el cohorte de la plataforma. El cohorte es
 * "videos recientes con historia temprana" (los que `readVideoSeries` puede
 * situar por edad); la clasificación es derivada al leer, nada se persiste.
 * Si el cohorte aún es chico (ingesta joven), devuelve vacío/null — honesto.
 */

/** externalIds de los videos que van ≥2× la mediana de su plataforma a su edad. */
export async function readBreakoutIds(platform: Platform): Promise<Set<string>> {
  const series = await readVideoSeries({ platform });
  const cohort = series.map((s) => s.points);
  const ids = new Set<string>();
  for (const s of series) {
    // Cohorte sin el propio video: que no compita contra sí mismo.
    const others = series.filter((o) => o.externalId !== s.externalId);
    if (isBreakout(s.points, others.map((o) => o.points))) ids.add(s.externalId);
  }
  // Guard: si "todo" despega es que el cohorte no discrimina; mejor nada.
  return ids.size * 2 > cohort.length ? new Set() : ids;
}

export interface VideoBenchmark {
  result: BenchmarkResult;
  /** curva típica (mediana) del cohorte, para superponer. */
  curve: AgePoint[];
}

/** Benchmark de UN video contra su plataforma (para la página de detalle). */
export async function readVideoBenchmark(
  platform: Platform,
  externalId: string,
): Promise<VideoBenchmark | null> {
  const series = await readVideoSeries({ platform });
  const own = series.find((s) => s.externalId === externalId);
  if (!own) return null;

  const cohort = series
    .filter((s) => s.externalId !== externalId)
    .map((s) => s.points);
  const result = benchmarkAgainstCohort(own.points, cohort);
  if (!result) return null;

  return { result, curve: medianCurve(cohort) };
}
