import { authorizationServerMetadata } from "@/modules/oauth/config";

export const runtime = "nodejs";

/** Metadata pública: cacheable y legible desde cualquier origen. */
const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "public, max-age=300",
};

/**
 * Authorization Server Metadata (RFC 8414). Ojo con
 * `code_challenge_methods_supported`: si falta, los clientes MCP **deben**
 * abortar el flujo (es como descubren que hay PKCE).
 */
export function GET() {
  return new Response(JSON.stringify(authorizationServerMetadata()), {
    headers: HEADERS,
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS });
}
