import { appUrl, resourceUrl } from "@/modules/oauth/config";

export const runtime = "nodejs";

/**
 * Catálogo de APIs (RFC 9727): linkset (RFC 9264) con las dos APIs públicas del
 * sitio — el servidor MCP y el health check — y a dónde ir por documentación,
 * estado y metadata de auth.
 */
export function GET() {
  const base = appUrl();
  const body = {
    linkset: [
      {
        anchor: resourceUrl(),
        "service-doc": [{ href: `${base}/landing#mcp`, type: "text/html" }],
        "service-meta": [
          {
            href: `${base}/.well-known/oauth-protected-resource`,
            type: "application/json",
          },
        ],
        status: [{ href: `${base}/api/health`, type: "application/json" }],
      },
      {
        anchor: `${base}/api/health`,
        "service-doc": [{ href: `${base}/landing`, type: "text/html" }],
      },
    ],
  };

  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/linkset+json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
