import { metadataCorsOptionsRequestHandler } from "mcp-handler";
import { appUrl, issuer, resourceUrl, SCOPE } from "@/modules/oauth/config";
import { agentJson } from "@/core/lib/agent-response";

export const runtime = "nodejs";

/**
 * Protected Resource Metadata (RFC 9728): le dice al cliente MCP qué
 * authorization server usar. El spec exige servirlo, y el 401 del MCP apunta
 * aquí con `WWW-Authenticate: … resource_metadata="…"`.
 *
 * Se redacta a mano (antes lo generaba `protectedResourceHandler` de
 * mcp-handler) porque ese helper solo emite `resource` y
 * `authorization_servers`: sin `scopes_supported` un agente no sabe qué scope
 * pedir y los validadores del ecosistema lo dan por incompleto. Los dos campos
 * originales conservan exactamente el mismo valor, así que los clientes ya
 * autorizados no se enteran del cambio.
 *
 * Catch-all opcional porque el MCP no vive en la raíz: los clientes prueban
 * primero `/.well-known/oauth-protected-resource/api/mcp` y luego la raíz.
 */
export function GET() {
  return agentJson({
    resource: resourceUrl(),
    authorization_servers: [issuer()],
    scopes_supported: [SCOPE],
    // Los tokens van SOLO en el header (nunca en query string).
    bearer_methods_supported: ["header"],
    resource_name: "Reels Analytics MCP",
    resource_documentation: `${appUrl()}/auth.md`,
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
