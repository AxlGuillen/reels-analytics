import { appUrl, resourceUrl, SCOPE } from "@/modules/oauth/config";
import { MCP_TOOLS } from "@/modules/mcp/catalog";
import { PRODUCT_SUMMARY } from "@/modules/mcp/discovery";
import { agentJson } from "@/core/lib/agent-response";
import packageJson from "../../../../../package.json";

export const runtime = "nodejs";

/**
 * MCP Server Card (SEP-1649, aún en draft: modelcontextprotocol PR #2127).
 * Anuncia el servidor MCP del sitio: identidad, transporte, auth y tools.
 * Las tools salen de `modules/mcp/catalog.ts` — la misma fuente única que el
 * route handler del MCP y la página /settings/mcp.
 */
export function GET() {
  const body = {
    // Draft: el shape puede ajustarse cuando el SEP se estabilice.
    serverInfo: {
      name: "reels-analytics",
      title: "Reels Analytics MCP",
      version: packageJson.version,
      description: PRODUCT_SUMMARY,
      websiteUrl: `${appUrl()}/landing`,
    },
    transport: {
      type: "streamable-http",
      url: resourceUrl(),
    },
    authentication: {
      type: "oauth2",
      scopes: [SCOPE],
      resourceMetadataUrl: `${appUrl()}/.well-known/oauth-protected-resource`,
    },
    capabilities: {
      tools: MCP_TOOLS.map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
      })),
    },
  };

  return agentJson(body);
}
