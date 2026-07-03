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
