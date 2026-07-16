/**
 * Modelo de periodo para el Overview: semana o mes, navegable, con sub-buckets
 * (días dentro de la semana, semanas dentro del mes). Puro y testeable.
 *
 * Convención: se opera sobre "day keys" `YYYY-MM-DD` que ya son fecha calendario
 * del creador (las produce `dayKey`/`weekKey` en la zona horaria del creador).
 * Para la aritmética se tratan como medianoche UTC — igual que hace `weekKey` —
 * así no se re-desplazan por zona.
 */

import { monthLabel } from "@/core/lib/datetime";

export type PeriodGranularity = "week" | "month";

export interface SubBucket {
  /** clave del sub-bucket (day key o week key). */
  key: string;
  /** etiqueta corta para el eje (p. ej. "Lun" o "13–19"). */
  label: string;
  /** días calendario que agrupa (para sumar métricas por día). */
  dayKeys: string[];
}

export interface Period {
  granularity: PeriodGranularity;
  /** clave canónica: lunes de la semana (YYYY-MM-DD) o mes (YYYY-MM). */
  key: string;
  /** etiqueta legible del periodo (p. ej. "13 – 19 jul" o "Jul 2026"). */
  label: string;
  /** todos los días calendario del periodo. */
  dayKeys: string[];
  /** desglose interno para las barras. */
  sub: { granularity: "day" | "week"; buckets: SubBucket[] };
  /** day key dentro del periodo anterior (para navegar ◀). */
  prevAnchor: string;
  /** day key dentro del periodo siguiente, o null si cae en el futuro (▶). */
  nextAnchor: string | null;
}

const DAY_MS = 86_400_000;
const SHORT_WEEKDAY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const toUtc = (day: string): Date => new Date(`${day}T00:00:00Z`);
const keyOf = (d: Date): string => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number): string =>
  keyOf(new Date(toUtc(day).getTime() + n * DAY_MS));

/** Lunes de la semana a la que pertenece `day` (0 = lunes). */
function mondayOf(day: string): string {
  const dow = (toUtc(day).getUTCDay() + 6) % 7;
  return addDays(day, -dow);
}

/** Mes (`YYYY-MM`) desplazado `n` meses. */
function shiftMonth(monthKey: string, n: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Días calendario de un mes `YYYY-MM`. */
function daysOfMonth(monthKey: string): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const days: string[] = [];
  const d = new Date(Date.UTC(y, m - 1, 1));
  while (d.getUTCMonth() === m - 1) {
    days.push(keyOf(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

const dayOfMonth = (day: string): number => toUtc(day).getUTCDate();
const fmtDayMonth = (day: string): string =>
  new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(toUtc(day));
const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function weekPeriod(anchorDay: string, today: string): Period {
  const monday = mondayOf(anchorDay);
  const dayKeys = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const sunday = dayKeys[6];
  const nextMonday = addDays(monday, 7);
  return {
    granularity: "week",
    key: monday,
    label: `${fmtDayMonth(monday)} – ${fmtDayMonth(sunday)}`,
    dayKeys,
    sub: {
      granularity: "day",
      buckets: dayKeys.map((d) => ({
        key: d,
        label: SHORT_WEEKDAY[toUtc(d).getUTCDay()],
        dayKeys: [d],
      })),
    },
    prevAnchor: addDays(monday, -7),
    nextAnchor: nextMonday > mondayOf(today) ? null : nextMonday,
  };
}

function monthPeriod(monthKey: string, today: string): Period {
  const dayKeys = daysOfMonth(monthKey);

  // Agrupa los días del mes por su semana (lunes), en orden.
  const byWeek = new Map<string, string[]>();
  for (const d of dayKeys) {
    const wk = mondayOf(d);
    const arr = byWeek.get(wk) ?? [];
    arr.push(d);
    byWeek.set(wk, arr);
  }
  const buckets: SubBucket[] = [...byWeek.entries()].map(([wk, days]) => ({
    key: wk,
    label: `${dayOfMonth(days[0])}–${dayOfMonth(days[days.length - 1])}`,
    dayKeys: days,
  }));

  const nextMonth = shiftMonth(monthKey, 1);
  return {
    granularity: "month",
    key: monthKey,
    label: capitalize(monthLabel(monthKey)),
    dayKeys,
    sub: { granularity: "week", buckets },
    prevAnchor: `${shiftMonth(monthKey, -1)}-01`,
    nextAnchor: nextMonth > today.slice(0, 7) ? null : `${nextMonth}-01`,
  };
}

/**
 * Resuelve el periodo a mostrar. `anchor` es un day key dentro del periodo
 * deseado (o `undefined` = el periodo que contiene a `today`). `today` es el day
 * key de hoy en la zona del creador — se inyecta para mantener la función pura.
 */
export function resolvePeriod(
  granularity: PeriodGranularity,
  anchor: string | undefined,
  today: string,
): Period {
  const anchorDay = anchor && /^\d{4}-\d{2}-\d{2}$/.test(anchor) ? anchor : today;
  return granularity === "week"
    ? weekPeriod(anchorDay, today)
    : monthPeriod(anchorDay.slice(0, 7), today);
}

/**
 * Suma valores por día sobre los días de cada sub-bucket y sobre el total.
 * `dayMap` mapea day key → valor numérico. Devuelve `{ total, perBucket }`.
 */
export function sumOverPeriod(
  period: Period,
  dayMap: Map<string, number>,
): { total: number; perBucket: number[] } {
  const at = (d: string) => dayMap.get(d) ?? 0;
  const total = period.dayKeys.reduce((acc, d) => acc + at(d), 0);
  const perBucket = period.sub.buckets.map((b) =>
    b.dayKeys.reduce((acc, d) => acc + at(d), 0),
  );
  return { total, perBucket };
}
