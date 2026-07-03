/** Formatea números grandes de forma compacta: 12345 → "12.3K". */
export function formatCount(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("es", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Fecha corta legible: "3 jul 2026". */
export function formatDate(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(date);
}

/** Hora del día 24h: "20:15". */
export function formatTime(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

/** Fecha y hora: "3 jul 2026, 20:15". */
export function formatDateTime(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

/** Duración en segundos a "m:ss": 83 → "1:23". */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Proporción (0-1) a porcentaje: 0.0345 → "3.5%". */
export function formatPercent(ratio: number): string {
  return new Intl.NumberFormat("es", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(ratio);
}
