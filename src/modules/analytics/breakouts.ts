import "server-only";
import type { Platform } from "@/core/domain";
import { weekKey } from "@/core/lib/datetime";
import { readVideoOwner, readVideoSeries, type VideoSeries } from "./history";
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
 * Breakouts y benchmark contra el cohorte de la CUENTA. El cohorte se acota a la
 * **misma semana de publicación** para neutralizar el crecimiento de la
 * audiencia: comparar contra todo el catálogo mezclaba "mejor contenido" con
 * "más seguidores que hace un mes". Si una semana no junta cohorte suficiente,
 * `weeklyCohort` cae al catálogo completo DE LA CUENTA y lo reporta en `scope`.
 *
 * Nunca se mezclan cuentas: un video de Valorant comparado contra los de LoL, o
 * uno de una cuenta de decenas de seguidores contra una de miles, daría un
 * múltiplo sin significado. Una vista "todas" calcula cada cuenta por separado.
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

/** Breakouts de UNA cuenta con su múltiplo, del más fuerte al más débil. */
export async function readBreakoutDetails(
  accountId: string,
): Promise<BreakoutDetail[]> {
  const series = await readVideoSeries({ account: { accountId } });
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
export async function readBreakoutIds(accountIds: string[]): Promise<Set<string>> {
  const perAccount = await Promise.all(accountIds.map(readBreakoutDetails));
  return new Set(perAccount.flat().map((d) => d.externalId));
}

export interface VideoBenchmark {
  result: BenchmarkResult;
  /** curva típica (mediana) del cohorte, para superponer. */
  curve: AgePoint[];
  /** contra qué se comparó: su semana o todo el catálogo. */
  scope: CohortScope;
}

/**
 * Benchmark de UN video contra el cohorte semanal de SU cuenta (página de
 * detalle). Resuelve la cuenta dueña: antes se leía siempre la principal, así
 * que un video de una cuenta secundaria no aparecía y no tenía benchmark.
 */
export async function readVideoBenchmark(
  platform: Platform,
  externalId: string,
): Promise<VideoBenchmark | null> {
  const accountId = await readVideoOwner(platform, externalId);
  if (!accountId) return null;
  const series = await readVideoSeries({ account: { accountId } });
  const members = toMembers(series);
  const own = members.find((m) => m.key === externalId);
  if (!own) return null;

  const { cohort, scope } = weeklyCohort(own, members);
  const result = benchmarkAgainstCohort(own.points, cohort);
  if (!result) return null;

  return { result, curve: medianCurve(cohort), scope };
}
