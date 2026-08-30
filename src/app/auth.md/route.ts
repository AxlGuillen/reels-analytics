import { appUrl, resourceUrl, SCOPE } from "@/modules/oauth/config";
import { agentText } from "@/core/lib/agent-response";

export const runtime = "nodejs";

/**
 * auth.md (convención de workos/auth.md): instrucciones de registro y
 * autenticación para agentes, en markdown legible por máquina y humano.
 * Route handler (no archivo en public/) para interpolar APP_URL y fijar el
 * content-type.
 *
 * En INGLÉS a propósito (decisión del creador): la superficie de auth para
 * agentes se estandariza en inglés, que es el idioma del ecosistema y de los
 * clientes que la consumen. El título literal "Auth.md" es parte de la
 * convención — los validadores lo buscan como heading.
 */
export function GET() {
  const base = appUrl();
  const body = `# Auth.md — Reels Analytics

This site exposes a **read-only MCP server** with the creator's analytics. The
human dashboard is private; agents authenticate through OAuth.

## Protected resource

- MCP (Streamable HTTP): \`${resourceUrl()}\`
- Single scope: \`${SCOPE}\` (read-only; it never publishes or modifies anything)
- Resource metadata: \`${base}/.well-known/oauth-protected-resource\`

## Registration (Dynamic Client Registration, RFC 7591)

There is no prior relationship: register yourself.

\`\`\`
POST ${base}/api/oauth/register
Content-Type: application/json

{ "client_name": "My agent", "redirect_uris": ["https://your-app.example/callback"] }
\`\`\`

\`redirect_uris\` must be HTTPS (or HTTP on loopback only), and they are matched
exactly from then on. Public client: no \`client_secret\`.

## Flow (OAuth 2.1)

1. \`GET ${base}/oauth/authorize\` with \`response_type=code\`, your
   \`client_id\`, \`redirect_uri\`, \`state\` and PKCE (\`code_challenge\`, with
   method \`S256\` — mandatory). The site owner signs in and grants access.
2. Exchange the code at \`POST ${base}/api/oauth/token\`
   (\`grant_type=authorization_code\` + \`code_verifier\`). Codes are single-use.
3. Refresh with \`grant_type=refresh_token\` — refresh tokens **rotate**: every
   refresh invalidates the previous one, and replaying an old one revokes the
   whole family.
4. Call the MCP server with \`Authorization: Bearer <access_token>\` (tokens
   never travel in the URL).

Full discovery: \`${base}/.well-known/oauth-authorization-server\`.

## Public endpoint (no auth)

Before registering, you can inspect the service anonymously:
\`${base}/api/public/mcp\` is a public MCP server with informational tools
(project summary, this connection guide, the catalog of protected tools and
service health). It exposes no creator data.

## Notes

- Tokens are issued with an audience bound to the MCP server: they are not
  valid for any other resource, and third-party tokens are not accepted.
- Tool usage guide: \`${base}/.well-known/agent-skills/reels-analytics-mcp/SKILL.md\`
`;

  return agentText(body);
}
