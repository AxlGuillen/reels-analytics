import { appUrl, resourceUrl, SCOPE } from "@/modules/oauth/config";
import { MCP_TOOLS } from "@/modules/mcp/catalog";
import { PRODUCT_SUMMARY } from "@/modules/mcp/discovery";
import { agentJson } from "@/core/lib/agent-response";
import packageJson from "../../../../package.json";

export const runtime = "nodejs";

/**
 * A2A Agent Card (a2a-protocol.org). Redactado HONESTO a propósito: esto es un
 * servicio de datos con interfaz MCP, no un agente conversacional, y no hay
 * endpoint JSON-RPC A2A — el card lo declara tal cual para descubrimiento.
 */
export function GET() {
  const body = {
    protocolVersion: "0.3.0",
    name: "Reels Analytics",
    version: packageJson.version,
    description: `${PRODUCT_SUMMARY} No es un agente conversacional: expone datos vía MCP (Streamable HTTP, OAuth 2.1).`,
    url: resourceUrl(),
    preferredTransport: "HTTP+JSON",
    provider: { organization: "axelsine", url: `${appUrl()}/landing` },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    // `oauth2` con flows explícitos: en la URL de descubrimiento servimos
    // RFC 8414, no un documento OIDC, así que `openIdConnect` mentiría.
    securitySchemes: {
      oauth: {
        type: "oauth2",
        flows: {
          authorizationCode: {
            authorizationUrl: `${appUrl()}/oauth/authorize`,
            tokenUrl: `${appUrl()}/api/oauth/token`,
            scopes: { [SCOPE]: "Lectura de la analítica del creador" },
          },
        },
      },
    },
    defaultInputModes: ["application/json"],
    defaultOutputModes: ["application/json", "text/plain"],
    // Espejo de las tools más representativas del catálogo MCP.
    skills: MCP_TOOLS.slice(0, 4).map((tool) => ({
      id: tool.name,
      name: tool.title,
      description: tool.description,
      tags: ["analytics", "creator", "tiktok", "instagram", SCOPE],
    })),
  };

  return agentJson(body);
}
