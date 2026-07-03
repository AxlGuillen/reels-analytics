/** Formatea números grandes de forma compacta: 12345 → "12.3K". */
export function formatCount(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("es", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Fecha corta legible: "3 jul 2026". */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
