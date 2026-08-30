import { createMcpHandler } from "mcp-handler";
import {
  getConnectionGuide,
  getProjectInfo,
  getServiceStatus,
  listAnalyticsTools,
  PUBLIC_TOOL_META,
} from "@/modules/mcp/public";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Servidor MCP PÚBLICO (Streamable HTTP) en /api/public/mcp: tools informativas
 * SIN auth y sin datos del creador — qué es el proyecto, cómo pedir acceso, el
 * catálogo de tools protegidas y la salud pública del servicio.
 *
 * Vive en un endpoint separado de /api/mcp a propósito: el servidor de
 * analítica debe seguir respondiendo 401 a los anónimos, porque ese 401 (con
 * `WWW-Authenticate`) es lo que dispara el flujo OAuth de los conectores.
 * El proxy excluye `api/public` del gate de sesión.
 */

function text(value: string) {
  return { content: [{ type: "text" as const, text: value }] };
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool("get_project_info", {
      ...PUBLIC_TOOL_META.get_project_info,
      inputSchema: {},
    }, async () => text(getProjectInfo()));

    server.registerTool("get_connection_guide", {
      ...PUBLIC_TOOL_META.get_connection_guide,
      inputSchema: {},
    }, async () => text(getConnectionGuide()));

    server.registerTool("list_analytics_tools", {
      ...PUBLIC_TOOL_META.list_analytics_tools,
      inputSchema: {},
    }, async () => text(JSON.stringify(listAnalyticsTools(), null, 2)));

    server.registerTool("get_service_status", {
      ...PUBLIC_TOOL_META.get_service_status,
      inputSchema: {},
    }, async () => text(JSON.stringify(await getServiceStatus(), null, 2)));
  },
  {},
  { basePath: "/api/public", maxDuration: 30 },
);

export { handler as GET, handler as POST, handler as DELETE };
