import { appUrl, resourceUrl } from "@/modules/oauth/config";
import { PRODUCT_SUMMARY } from "@/modules/mcp/discovery";
import { agentJson } from "@/core/lib/agent-response";
import { MCP_TOOLS } from "@/modules/mcp/catalog";

export const runtime = "nodejs";

/** Host sin esquema, para los identificadores URN del manifiesto. */
function hostname(): string {
  return new URL(appUrl()).hostname;
}

/**
 * Manifiesto ARD (Agentic Resource Discovery, agenticresourcediscovery.org —
 * spec joven): inventario de capacidades del sitio para registries de agentes,
 * con queries representativas para embeddings semánticos.
 */
export function GET() {
  const host = hostname();
  const body = {
    specVersion: "0.1",
    host: {
      name: "Reels Analytics",
      description: PRODUCT_SUMMARY,
      url: `${appUrl()}/landing`,
    },
    entries: [
      {
        // El spec ARD nombra este campo `identifier` (no `id`).
        identifier: `urn:air:${host}:mcp:analytics`,
        displayName: "Servidor MCP de analítica del creador",
        type: "application/json",
        url: resourceUrl(),
        description: `Servidor MCP (Streamable HTTP, OAuth 2.1) con ${MCP_TOOLS.length} tools de solo lectura sobre la analítica persistida de TikTok e Instagram Reels.`,
        representativeQueries: [
          "¿Cuál fue mi mejor video de la última semana?",
          "Compara el rendimiento de TikTok contra Instagram este mes",
          "¿Qué videos están despegando por encima de su cohorte?",
          "¿Qué día y hora me conviene publicar?",
        ],
      },
      {
        identifier: `urn:air:${host}:api:health`,
        displayName: "Health check del servicio",
        type: "application/json",
        url: `${appUrl()}/api/health`,
        description:
          "Estado operativo del sitio: base de datos, ingesta diaria, MCP y render (JSON; 503 solo si algo está roto).",
        representativeQueries: [
          "¿Está funcionando reels-analytics?",
          "¿La ingesta de datos está al día?",
        ],
      },
    ],
  };

  return agentJson(body);
}
