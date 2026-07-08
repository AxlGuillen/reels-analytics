/**
 * Utilidades para derivar el "horario" y "día" de publicación a partir del
 * timestamp que devuelve cada plataforma.
 *
 * Nota: para análisis por hora/día conviene fijar una zona horaria consistente
 * (la del creador). Estas funciones aceptan un `timeZone` opcional; cuando se
 * defina la config real se centralizará ahí.
 */

const WEEKDAYS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** Hora del día (0-23) en la zona horaria dada. */
export function hourOfDay(date: Date, timeZone?: string): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
  return Number.parseInt(hour, 10) % 24;
}

/** Índice del día de la semana (0 = domingo … 6 = sábado) en la zona dada. */
export function weekdayIndex(date: Date, timeZone?: string): number {
  const shortDay = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[shortDay] ?? date.getDay();
}

/** Día de la semana en español. */
export function weekday(date: Date, timeZone?: string): Weekday {
  return WEEKDAYS[weekdayIndex(date, timeZone)];
}

/** Clave de día `YYYY-MM-DD` en la zona dada (ordenable lexicográficamente). */
export function dayKey(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(date);
}

/** Clave de mes `YYYY-MM` en la zona dada (ordenable lexicográficamente). */
export function monthKey(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone,
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

/** Etiqueta de mes legible en español (p. ej. "jul 2026") a partir de `YYYY-MM`. */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, 1));
  return new Intl.DateTimeFormat("es-MX", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
