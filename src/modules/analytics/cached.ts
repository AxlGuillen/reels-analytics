import "server-only";
import { unstable_cache } from "next/cache";
import { env } from "@/core/config/env";
import { PLATFORMS, type Platform } from "@/core/domain";
import { ANALYTICS_TAG } from "@/core/lib/cache-tags";
import {
  mergeGrowth,
  mergeMonthGained,
  reviveGrowth,
  serializeGrowth,
} from "./cache-shape";
import {
  readGrowth,
  readSnapshotSeries,
  readVideoSeries,
  type GrowthData,
} from "./history";
import { gainedByMonth, type MonthGained } from "./insights";
import { DEFAULT_AGE_DAYS, viewsAtAge } from "./timeseries";

/**
 * Caché de la analítica (Vercel Data Cache vía `unstable_cache`).
 *
 * Por qué: los snapshots solo cambian cuando se captura (cron diario + botón
 * manual), pero cada cambio de semana/mes volvía a descargar toda la historia
 * (~27k snapshots de TikTok). Aquí se cachean los RESULTADOS ya agregados — el
 * crudo pesa MB y crece ~445 filas/día; lo agregado pesa KB.
 *
 * Política (una sola, en `analyticsCache`):
 * - Invalidación por evento: tag `ANALYTICS_TAG`, que expiran el cron de
 *   ingesta y las acciones de captura. Es lo que garantiza ver la captura de
 *   las 08:00 en la primera visita posterior.
 * - `revalidate` de 1 día solo como red por si una invalidación fallara.
 * - Clave con el commit desplegado: cada deploy arranca con caché limpio, así
 *   un cambio de forma de los datos nunca lee entradas viejas.
 * - Solo se cachea POR PLATAFORMA; "todas" se compone en memoria.
 *
 * Nada de aquí depende del usuario ni de la hora: la app es single-user y las
 * páginas siguen detrás del proxy; el periodo (semana/mes) se resuelve fuera.
 */

const DAY_S = 86_400;
const NAMESPACE = env("VERCEL_GIT_COMMIT_SHA")?.slice(0, 12) ?? "local";

/** Envuelve una lectura con la política de caché de la analítica. Los
 *  argumentos forman parte de la clave; el resultado DEBE ser JSON puro. */
export function analyticsCache<A extends unknown[], R>(
  name: string,
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return unstable_cache(fn, ["analytics", NAMESPACE, name], {
    revalidate: DAY_S,
    tags: [ANALYTICS_TAG],
  });
}

const scope = (platform?: Platform): Platform[] =>
  platform ? [platform] : [...PLATFORMS];

const growthFor = analyticsCache("growth", async (platform: Platform) =>
  serializeGrowth(await readGrowth({ platform })),
);

/** `readGrowth` cacheado (catálogo con métrica vigente + series de cuenta). */
export async function readGrowthCached(
  { platform }: { platform?: Platform } = {},
): Promise<GrowthData> {
  const parts = await Promise.all(scope(platform).map((p) => growthFor(p)));
  return mergeGrowth(parts.map(reviveGrowth));
}

const monthGainedFor = analyticsCache("month-gained", async (platform: Platform) =>
  gainedByMonth(await readSnapshotSeries({ platform })),
);

/** Vistas ganadas por mes (momentum del catálogo) — `/growth`. */
export async function readMonthGainedCached(
  { platform }: { platform?: Platform } = {},
): Promise<MonthGained[]> {
  return mergeMonthGained(
    await Promise.all(scope(platform).map((p) => monthGainedFor(p))),
  );
}

const viewsAtAgeFor = analyticsCache(
  "views-at-age",
  async (platform: Platform, days: number): Promise<[string, number][]> =>
    (await readVideoSeries({ platform })).flatMap((s) => {
      const views = viewsAtAge(s.points, days);
      return views == null ? [] : [[s.externalId, views]];
    }),
);

/** Vistas a N días por video (solo los que tienen historia temprana). */
export async function readViewsAtAgeCached({
  platform,
  days = DEFAULT_AGE_DAYS,
}: { platform?: Platform; days?: number } = {}): Promise<Map<string, number>> {
  const parts = await Promise.all(
    scope(platform).map((p) => viewsAtAgeFor(p, days)),
  );
  return new Map(parts.flat());
}
