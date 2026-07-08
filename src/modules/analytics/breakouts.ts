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

export interface BreakoutDetail {
  externalId: string;
  result: BenchmarkResult;
}

/** Breakouts con su múltiplo, ordenados del más fuerte al más débil. */
export async function readBreakoutDetails(
  platform: Platform,
): Promise<BreakoutDetail[]> {
  const series = await readVideoSeries({ platform });
  const details: BreakoutDetail[] = [];
  for (const s of series) {
    // Cohorte sin el propio video: que no compita contra sí mismo.
    const others = series
      .filter((o) => o.externalId !== s.externalId)
      .map((o) => o.points);
    const result = benchmarkAgainstCohort(s.points, others);
    if (result && isBreakout(s.points, others)) {
      details.push({ externalId: s.externalId, result });
    }
  }
  // Guard: si "todo" despega es que el cohorte no discrimina; mejor nada.
  if (details.length * 2 > series.length) return [];
  return details.sort((a, b) => b.result.multiple - a.result.multiple);
}

/** externalIds de los videos que van ≥2× la mediana de su plataforma a su edad. */
export async function readBreakoutIds(platform: Platform): Promise<Set<string>> {
  const details = await readBreakoutDetails(platform);
  return new Set(details.map((d) => d.externalId));
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
