import { appUrl, resourceUrl, SCOPE } from "@/modules/oauth/config";
import { mcpConnectionInfo, PRODUCT_SUMMARY } from "@/modules/mcp/discovery";
import { MCP_TOOLS } from "@/modules/mcp/catalog";
import { agentText } from "@/core/lib/agent-response";
import { COPY, type Lang } from "@/app/(marketing)/landing/content";

export const runtime = "nodejs";

/**
 * Versión markdown de la landing para agentes ("Markdown for Agents"): se sirve
 * directo en /landing.md (y /landing.md?lang=en) y por negociación cuando
 * /landing o /en/landing reciben `Accept: text/markdown` (rewrites en
 * next.config). Es contenido CURADO, no una transcripción del HTML: los pasos y
 * features salen del mismo `content.ts` que la landing, y el resto (resumen,
 * conexión MCP) se redacta aquí por idioma.
 */

/** Cadenas propias del documento markdown que no existen en la landing HTML. */
const MD = {
  es: {
    summary: PRODUCT_SUMMARY,
    howTitle: "Cómo funciona (tres pasos, cero mantenimiento)",
    offersTitle: "Qué ofrece",
    mcpTitle: "Servidor MCP",
    toolsTitle: "Tools",
    linksTitle: "Enlaces",
    linkLanding: "Landing (HTML)",
    linkCode: "Código",
    linkHealth: "Salud del servicio",
    linkAuth: "Registro para agentes",
  },
  en: {
    summary:
      "Reels Analytics centralizes a creator's TikTok and Instagram Reels metrics: it stores one daily snapshot per video and turns that history into decisions (which format performs, best day and hour, growth curves, weekly-cohort benchmarks).",
    howTitle: "How it works (three steps, zero maintenance)",
    offersTitle: "What it offers",
    mcpTitle: "MCP server",
    toolsTitle: "Tools",
    linksTitle: "Links",
    linkLanding: "Landing (HTML)",
    linkCode: "Code",
    linkHealth: "Service health",
    linkAuth: "Agent registration guide",
  },
} as const;

/** Bloque de conexión al MCP por idioma (el español reusa el de discovery.ts,
 *  que es el mismo que publica la skill; el inglés lo traduce con las mismas
 *  URLs). */
function connectionInfo(lang: Lang): string {
  if (lang === "es") return mcpConnectionInfo();
  return [
    `MCP server (Streamable HTTP): ${resourceUrl()}`,
    "Authentication: OAuth 2.1 with PKCE S256 and dynamic client registration (RFC 7591) — paste the URL into a Claude/Cowork remote connector and the flow is automatic.",
    `Scope: ${SCOPE} (read-only).`,
    `Discovery: ${appUrl()}/.well-known/oauth-protected-resource`,
    `Agent registration guide: ${appUrl()}/auth.md`,
  ].join("\n");
}

export function GET(request: Request) {
  // Doble detección: `?lang=en` (acceso directo) o pathname bajo `/en/`
  // (negociación por Accept desde /en/landing: el rewrite conserva la URL
  // original en `request.url`, así que la query del destination no llega).
  const url = new URL(request.url);
  const lang: Lang =
    url.searchParams.get("lang") === "en" || url.pathname.startsWith("/en/")
      ? "en"
      : "es";
  const base = appUrl();
  const copy = COPY[lang];
  const md = MD[lang];
  const canonicalPath = lang === "en" ? "/en/landing" : "/landing";

  const tools = MCP_TOOLS.map(
    (tool) => `- **${tool.title}**: ${tool.description}`,
  ).join("\n");
  const steps = copy.steps.items
    .map((step, i) => `${i + 1}. **${step.title}** — ${step.body}`)
    .join("\n");
  const features = copy.features.items
    .map((feature) => `- **${feature.title}**: ${feature.body}`)
    .join("\n");

  const body = `# ${copy.meta.title}

${md.summary}

${copy.hero.sub}

## ${md.howTitle}

${steps}

## ${md.offersTitle}

${features}

## ${md.mcpTitle}

${connectionInfo(lang)}

### ${md.toolsTitle}

${tools}

## ${md.linksTitle}

- ${md.linkLanding}: ${base}${canonicalPath}
- ${md.linkCode}: https://github.com/AxlGuillen/reels-analytics
- ${md.linkHealth}: ${base}/api/health
- ${md.linkAuth}: ${base}/auth.md
- MCP: ${resourceUrl()}
`;

  // Extra: señala la relación con la versión HTML.
  return agentText(body, "text/markdown; charset=utf-8", {
    Link: `<${base}${canonicalPath}>; rel="canonical"; type="text/html"`,
  });
}
