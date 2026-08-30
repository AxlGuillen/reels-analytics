import { appUrl } from "@/modules/oauth/config";

export const runtime = "nodejs";

/**
 * robots.txt como route handler (no la convención tipada de Next) porque
 * necesitamos líneas fuera de RFC 9309: los `Content-Signal` de
 * contentsignals.org (draft-romm-aipref-contentsignals).
 *
 * Política elegida por el creador: la landing es pública e indexable, el resto
 * de la app es privada. Señales de contenido: búsqueda sí, respuestas de
 * asistentes sí, entrenamiento no.
 */

/** Rutas privadas (dashboard, APIs, flujo OAuth): fuera de cualquier crawler. */
const DISALLOW = [
  "/growth",
  "/content",
  "/settings/",
  "/video/",
  "/api/",
  "/oauth/",
];

/** Crawlers de IA con entrada explícita (misma política que el resto). */
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "Claude-User",
  "Google-Extended",
  "PerplexityBot",
  "Bytespider",
];

function rulesFor(agent: string): string {
  return [
    `User-agent: ${agent}`,
    "Allow: /landing",
    "Allow: /landing.md",
    "Allow: /login",
    ...DISALLOW.map((path) => `Disallow: ${path}`),
  ].join("\n");
}

export function GET() {
  const body = [
    "# reels-analytics — la landing es pública; el dashboard es privado.",
    rulesFor("*"),
    "",
    "# Crawlers de IA: mismas reglas, declaradas explícitamente.",
    ...AI_AGENTS.map((agent) => `${rulesFor(agent)}\n`),
    "# Preferencias de uso del contenido (contentsignals.org):",
    "# búsqueda sí, responder con él sí, entrenar modelos no.",
    "Content-Signal: search=yes, ai-input=yes, ai-train=no",
    "",
    `Sitemap: ${appUrl()}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
