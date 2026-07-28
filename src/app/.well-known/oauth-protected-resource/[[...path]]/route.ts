import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";
import { issuer, resourceUrl } from "@/modules/oauth/config";

export const runtime = "nodejs";

/**
 * Protected Resource Metadata (RFC 9728): le dice al cliente MCP qué
 * authorization server usar. El spec exige servirlo, y el 401 del MCP apunta
 * aquí con `WWW-Authenticate: … resource_metadata="…"`.
 *
 * Catch-all opcional porque el MCP no vive en la raíz: los clientes prueban
 * primero `/.well-known/oauth-protected-resource/api/mcp` y luego la raíz.
 */
export const GET = (req: Request) =>
  protectedResourceHandler({
    authServerUrls: [issuer()],
    resourceUrl: resourceUrl(),
  })(req);

export const OPTIONS = metadataCorsOptionsRequestHandler();
