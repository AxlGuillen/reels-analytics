import { appUrl, resourceUrl } from "@/modules/oauth/config";
import { mcpConnectionInfo, PRODUCT_SUMMARY } from "@/modules/mcp/discovery";
import { MCP_TOOLS } from "@/modules/mcp/catalog";
import { agentText } from "@/core/lib/agent-response";

export const runtime = "nodejs";

/**
 * Versión markdown de la landing para agentes ("Markdown for Agents"): se sirve
 * directo en /landing.md y por negociación cuando /landing recibe
 * `Accept: text/markdown` (rewrite en next.config). Es contenido CURADO, no una
 * transcripción del HTML — al cambiar la landing de fondo, tocar esto también
 * (nota en CLAUDE.md).
 */
export function GET() {
  const base = appUrl();
  const tools = MCP_TOOLS.map((tool) => `- **${tool.title}**: ${tool.description}`)
    .join("\n");

  const body = `# Reels Analytics — Mide lo que publicas. Entiende lo que crece.

${PRODUCT_SUMMARY}

Las APIs oficiales de TikTok e Instagram solo devuelven el presente. Reels
Analytics guarda un snapshot diario de cada video y convierte esa historia en
decisiones: qué formato rinde, qué día despegó y contra qué compararte.

## Cómo funciona (tres pasos, cero mantenimiento)

1. **Conecta tus cuentas** — OAuth con TikTok e Instagram; los tokens se
   refrescan solos antes de usarse.
2. **El cron captura a diario** — un snapshot por video cada 24 h; la historia
   se acumula aunque no abras el panel.
3. **Decide con evidencia** — curvas por video, benchmark contra su semana y un
   digest cada lunes por Telegram.

## Qué ofrece

- **Curva por video**: vistas a los 7 días, velocidad inicial y el momento
  exacto del despegue.
- **Cohorte semanal**: cada video se compara contra los de su misma semana —
  el crecimiento de audiencia no infla el veredicto.
- **Digest por Telegram**: cada lunes, vistas, seguidores, secciones y mejor
  video; además vigila que la ingesta no se caiga.
- **Habla con tus datos (MCP)**: servidor MCP de solo lectura para preguntarle
  a Claude por tu analítica desde donde escribes.

## Servidor MCP

${mcpConnectionInfo()}

### Tools

${tools}

## Enlaces

- Landing (HTML): ${base}/landing
- Código: https://github.com/AxlGuillen/reels-analytics
- Salud del servicio: ${base}/api/health
- Registro para agentes: ${base}/auth.md
- MCP: ${resourceUrl()}
`;

  // Extra: señala la relación con la versión HTML.
  return agentText(body, "text/markdown; charset=utf-8", {
    Link: `<${base}/landing>; rel="canonical"; type="text/html"`,
  });
}
