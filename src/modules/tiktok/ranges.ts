/**
 * Rangos de tiempo para acotar cuántos videos se cargan. Compartido entre la
 * página (calcula la fecha de corte) y el selector de la UI.
 */
export const VIDEO_RANGES = [
  { key: "1m", label: "Último mes", months: 1 },
  { key: "3m", label: "3 meses", months: 3 },
  { key: "6m", label: "6 meses", months: 6 },
  { key: "all", label: "Todos", months: null },
] as const;

export type RangeKey = (typeof VIDEO_RANGES)[number]["key"];

export const DEFAULT_RANGE: RangeKey = "1m";

/** Normaliza el valor del query param a un rango válido. */
export function resolveRange(value: string | undefined): RangeKey {
  return VIDEO_RANGES.some((r) => r.key === value)
    ? (value as RangeKey)
    : DEFAULT_RANGE;
}

/** Fecha de corte para un rango (undefined = sin límite / todos). */
export function sinceForRange(key: RangeKey): Date | undefined {
  const months = VIDEO_RANGES.find((r) => r.key === key)?.months ?? null;
  if (months == null) return undefined;
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  return since;
}
