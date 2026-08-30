/**
 * Respuestas de los endpoints públicos de descubrimiento para agentes
 * (.well-known, auth.md, landing.md…). Un solo lugar para CORS y caché: si la
 * política cambia, cambia para todos a la vez.
 */

const BASE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=3600",
};

/** JSON de descubrimiento (permite content-types como application/linkset+json). */
export function agentJson(
  body: unknown,
  contentType = "application/json",
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...BASE_HEADERS, "Content-Type": contentType, ...extra },
  });
}

/** Texto de descubrimiento (markdown, texto plano…). */
export function agentText(
  body: string,
  contentType = "text/markdown; charset=utf-8",
  extra: Record<string, string> = {},
): Response {
  return new Response(body, {
    headers: { ...BASE_HEADERS, "Content-Type": contentType, ...extra },
  });
}
