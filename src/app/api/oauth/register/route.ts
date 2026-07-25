import { SCOPE, oauthHeaders } from "@/modules/oauth/config";
import { registerClient } from "@/modules/oauth/store";
import { isValidRedirectUri } from "@/modules/oauth/tokens";

export const runtime = "nodejs";

const CORS = oauthHeaders({ "Access-Control-Allow-Methods": "POST, OPTIONS" });

function error(code: string, description: string, status = 400) {
  return new Response(JSON.stringify({ error: code, error_description: description }), {
    status,
    headers: CORS,
  });
}

/**
 * Dynamic Client Registration (RFC 7591). Los clientes MCP (Claude/Cowork) no
 * tienen relación previa con nosotros: se registran solos y reciben un
 * `client_id`. Cliente **público** (sin secret): la seguridad la da PKCE + la
 * validación exacta del `redirect_uri`.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("invalid_client_metadata", "El cuerpo debe ser JSON.");
  }

  const meta = body as {
    redirect_uris?: unknown;
    client_name?: unknown;
  };

  const uris = meta.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0) {
    return error("invalid_redirect_uri", "Falta `redirect_uris`.");
  }
  if (!uris.every((u): u is string => typeof u === "string" && isValidRedirectUri(u))) {
    return error(
      "invalid_redirect_uri",
      "Cada redirect_uri debe ser HTTPS (o HTTP en loopback) y sin fragmento.",
    );
  }

  const clientName =
    typeof meta.client_name === "string" && meta.client_name.trim()
      ? meta.client_name.trim().slice(0, 120)
      : null;

  const client = await registerClient({ clientName, redirectUris: uris });

  return new Response(
    JSON.stringify({
      client_id: client.clientId,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: SCOPE,
      client_id_issued_at: Math.floor(Date.now() / 1000),
    }),
    { status: 201, headers: CORS },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
