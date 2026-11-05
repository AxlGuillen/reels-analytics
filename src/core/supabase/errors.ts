import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Mensaje de error de Supabase con TODO el contexto disponible.
 *
 * Motivo: `error.message` por sí solo puede ser inútil. El caso que nos costó
 * caro: un filtro `.in()` con cientos de ids genera una URL enorme y el gateway
 * de Supabase la rechaza ANTES de que PostgREST la vea, así que la respuesta no
 * trae cuerpo y supabase-js solo entrega `{ message: "Bad Request" }` — sin
 * `code`, `details` ni `hint`. No hay "mensaje completo" que pedirle al
 * servidor: el diagnóstico tiene que ponerlo el cliente. Por eso esta función
 * adjunta el contexto de la consulta (cuántos ids iban en el filtro) y, cuando
 * reconoce esa firma, dice directamente qué pasó.
 */
export function supabaseError(
  table: string,
  error: PostgrestError,
  context?: Record<string, string | number>,
): Error {
  const parts = [error.message];
  if (error.code) parts.push(`code=${error.code}`);
  if (error.details) parts.push(`details=${error.details}`);
  if (error.hint) parts.push(`hint=${error.hint}`);
  for (const [key, value] of Object.entries(context ?? {})) {
    parts.push(`${key}=${value}`);
  }

  // 400 sin cuerpo = lo rechazó el gateway, no PostgREST. Con un `.in()` grande
  // la causa casi siempre es el largo de la URL (medido: ~28.8 KB de tope).
  const looksLikeGatewayReject =
    !error.code && !error.details && /^bad request$/i.test(error.message);
  if (looksLikeGatewayReject) {
    parts.push(
      "probable causa: URL demasiado larga (filtro .in() con demasiados ids); trocea el filtro",
    );
  }

  return new Error(`${table}: ${parts.join(" · ")}`);
}
