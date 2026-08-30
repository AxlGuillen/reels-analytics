import "server-only";
import { appUrl, resourceUrl, SCOPE } from "@/core/config/app";
import { MCP_TOOLS, type McpToolInfo } from "./catalog";
import { mcpConnectionInfo, PRODUCT_SUMMARY_EN } from "./discovery";

/**
 * Tools del MCP PÚBLICO (`/api/public/mcp`): informativas, sin datos del
 * creador y sin auth. Existen para que un agente que descubre el sitio pueda
 * entender qué es y cómo pedir acceso SIN pasar por OAuth — el servidor de
 * analítica (`/api/mcp`) sigue 100% protegido y en un endpoint aparte a
 * propósito: si aceptara sesiones anónimas, el 401 que dispara el flujo OAuth
 * de los conectores de Claude/Cowork dejaría de emitirse.
 *
 * En inglés, como el resto de la superficie para agentes (auth.md).
 */

export const PUBLIC_MCP_TOOLS = [
  {
    name: "get_project_info",
    title: "About Reels Analytics",
    description:
      "What this service is: a creator-owned analytics vault for TikTok and Instagram Reels. Returns a summary, how it works and public links.",
  },
  {
    name: "get_connection_guide",
    title: "How to connect",
    description:
      "How to get authorized access to the protected analytics MCP server (OAuth 2.1 with dynamic client registration).",
  },
  {
    name: "list_analytics_tools",
    title: "List analytics tools",
    description:
      "Catalog of the protected, read-only analytics tools available after OAuth authorization (names and descriptions only, no data).",
  },
  {
    name: "get_service_status",
    title: "Service status",
    description:
      "Public health of the service (ok / degraded / down), as reported by /api/health.",
  },
] as const satisfies readonly McpToolInfo[];

export type PublicMcpToolName = (typeof PUBLIC_MCP_TOOLS)[number]["name"];

/** Metadata por nombre (mismo patrón que TOOL_META del servidor protegido). */
export const PUBLIC_TOOL_META = Object.fromEntries(
  PUBLIC_MCP_TOOLS.map((tool) => [
    tool.name,
    { title: tool.title, description: tool.description },
  ]),
) as Record<PublicMcpToolName, { title: string; description: string }>;

export function getProjectInfo(): string {
  const base = appUrl();
  return [
    "# Reels Analytics",
    "",
    PRODUCT_SUMMARY_EN,
    "",
    "How it works: (1) the creator connects TikTok/Instagram via OAuth; (2) a daily cron captures one snapshot per video; (3) growth curves, weekly-cohort benchmarks and a Monday digest come out of that history.",
    "",
    "This is a single-creator, self-hosted service — the data belongs to one creator and is NOT public. Agents can read it only after the creator authorizes them (see get_connection_guide).",
    "",
    "Public links:",
    `- Landing: ${base}/landing (English: ${base}/en/landing)`,
    `- Markdown for agents: ${base}/landing.md`,
    `- Agent registration guide: ${base}/auth.md`,
    "- Source code: https://github.com/AxlGuillen/reels-analytics",
  ].join("\n");
}

export function getConnectionGuide(): string {
  return [
    "To access the creator's analytics you need OAuth authorization (the owner approves a consent screen).",
    "",
    mcpConnectionInfo("en"),
  ].join("\n");
}

export function listAnalyticsTools() {
  return {
    server: resourceUrl(),
    authorization: `OAuth 2.1, scope ${SCOPE} (read-only)`,
    note: "These tools require an access token; this public endpoint cannot call them.",
    tools: MCP_TOOLS,
  };
}

/** Salud pública del servicio (misma forma que /api/health sin credencial). */
export async function getServiceStatus(): Promise<{
  status: string;
  checkedAt?: string;
}> {
  try {
    const res = await fetch(`${appUrl()}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return (await res.json()) as { status: string; checkedAt?: string };
  } catch {
    return { status: "unknown" };
  }
}
