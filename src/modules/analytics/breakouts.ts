import "server-only";
import type { Platform } from "@/core/domain";
import { weekKey } from "@/core/lib/datetime";
import { readVideoSeries, type VideoSeries } from "./history";
import { CREATOR_TIMEZONE } from "./insights";
import {
  benchmarkAgainstCohort,
  isBreakout,
  medianCurve,
  weeklyCohort,
  type AgePoint,
  type BenchmarkResult,
  type CohortMember,
  type CohortScope,
} from "./timeseries";

/**
 * Breakouts y benchmark contra el cohorte de la plataforma. El cohorte se acota
 * a la **misma semana de publicación** para neutralizar el crecimiento de la
 * audiencia: comparar contra todo el catálogo mezclaba "mejor contenido" con
 * "más seguidores que hace un mes". Si una semana no junta cohorte suficiente,
 * `weeklyCohort` cae al catálogo completo y lo reporta en `scope`.
 *
 * Todo es derivado al leer, nada se persiste. Si el cohorte aún es chico
 * (ingesta joven), devuelve vacío/null — honesto.
 */

/** Convierte las series a miembros de cohorte, llaveados por semana de publicación. */
function toMembers(series: VideoSeries[]): CohortMember[] {
  return series.map((s) => ({
    key: s.externalId,
    weekKey: weekKey(s.publishedAt, CREATOR_TIMEZONE),
    points: s.points,
  }));
}

export interface BreakoutDetail {
  externalId: string;
  result: BenchmarkResult;
  /** contra qué se comparó: su semana o todo el catálogo. */
  scope: CohortScope;
}

/** Breakouts con su múltiplo, ordenados del más fuerte al más débil. */
export async function readBreakoutDetails(
  platform: Platform,
): Promise<BreakoutDetail[]> {
  const series = await readVideoSeries({ platform });
  const members = toMembers(series);
  const details: BreakoutDetail[] = [];
  for (const m of members) {
    const { cohort, scope } = weeklyCohort(m, members);
    const result = benchmarkAgainstCohort(m.points, cohort);
    if (result && isBreakout(m.points, cohort)) {
      details.push({ externalId: m.key, result, scope });
    }
  }
  // Guard: si "todo" despega es que el cohorte no discrimina; mejor nada.
  if (details.length * 2 > series.length) return [];
  return details.sort((a, b) => b.result.multiple - a.result.multiple);
}

/** externalIds de los videos que van ≥2× la mediana de su cohorte a su edad. */
export async function readBreakoutIds(platform: Platform): Promise<Set<string>> {
  const details = await readBreakoutDetails(platform);
  return new Set(details.map((d) => d.externalId));
}

export interface VideoBenchmark {
  result: BenchmarkResult;
  /** curva típica (mediana) del cohorte, para superponer. */
  curve: AgePoint[];
  /** contra qué se comparó: su semana o todo el catálogo. */
  scope: CohortScope;
}

/** Benchmark de UN video contra su cohorte semanal (para la página de detalle). */
export async function readVideoBenchmark(
  platform: Platform,
  externalId: string,
): Promise<VideoBenchmark | null> {
  const series = await readVideoSeries({ platform });
  const members = toMembers(series);
  const own = members.find((m) => m.key === externalId);
  if (!own) return null;

  const { cohort, scope } = weeklyCohort(own, members);
  const result = benchmarkAgainstCohort(own.points, cohort);
  if (!result) return null;

  return { result, curve: medianCurve(cohort), scope };
}
