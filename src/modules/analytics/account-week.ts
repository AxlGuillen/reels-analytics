/**
 * Comparación semana contra semana de UNA cuenta, para el digest. Puro y
 * testeado. Las métricas de cada semana salen de `summarizeOverview` (las
 * mismas del panel); aquí solo vive la variación.
 */

/**
 * Variación contra la semana anterior de LA MISMA cuenta (0.35 = +35 %). Es
 * la comparación que sí sirve entre cuentas de nichos y tamaños distintos:
 * cada una contra su propia historia. null si la semana anterior fue 0 — sin
 * base no hay porcentaje honesto (sería "+∞ %").
 */
export function weekOverWeek(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}
