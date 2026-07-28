/**
 * Tipos y rollup del health check. Sin `server-only` ni acceso a BD a propósito:
 * es la parte pura (y la que se testea). Los checks que tocan Supabase o la red
 * viven en `checks.ts`.
 */

export type CheckStatus = "ok" | "warn" | "fail";
export type HealthStatus = "ok" | "degraded" | "down";

export interface Check {
  name: string;
  status: CheckStatus;
  detail: string;
  meta?: Record<string, unknown>;
}

/**
 * Estado global a partir de los checks. Cualquier `fail` manda a `down` (que es
 * lo único que devuelve 503); si no, cualquier `warn` deja `degraded`.
 */
export function rollupStatus(checks: Check[]): HealthStatus {
  if (checks.some((c) => c.status === "fail")) return "down";
  if (checks.some((c) => c.status === "warn")) return "degraded";
  return "ok";
}
