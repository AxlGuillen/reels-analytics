import { appUrl, resourceUrl } from "@/modules/oauth/config";
import {
  mcpConnectionInfo,
  PRODUCT_SUMMARY,
  PRODUCT_SUMMARY_EN,
} from "@/modules/mcp/discovery";
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
    summary: PRODUCT_SUMMARY_EN,
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

/** Bloque de conexión al MCP por idioma: ambos centralizados en
 *  `modules/mcp/discovery.ts` (el inglés también lo usa el MCP público). */
function connectionInfo(lang: Lang): string {
  return mcpConnectionInfo(lang);
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
