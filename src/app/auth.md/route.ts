import { appUrl, resourceUrl, SCOPE } from "@/modules/oauth/config";
import { agentText } from "@/core/lib/agent-response";

export const runtime = "nodejs";

/**
 * auth.md (convención de workos/auth.md): instrucciones de registro y
 * autenticación para agentes, en markdown legible por máquina y humano.
 * Route handler (no archivo en public/) para interpolar APP_URL y fijar el
 * content-type.
 */
export function GET() {
  const base = appUrl();
  const body = `# Autenticación para agentes — Reels Analytics

Este sitio expone un **servidor MCP de solo lectura** con la analítica del
creador. El dashboard humano es privado; los agentes se autentican por OAuth.

## Recurso protegido

- MCP (Streamable HTTP): \`${resourceUrl()}\`
- Scope único: \`${SCOPE}\` (solo lectura; no publica ni modifica nada)
- Metadata del recurso: \`${base}/.well-known/oauth-protected-resource\`

## Registro (Dynamic Client Registration, RFC 7591)

No hay relación previa: regístrate solo.

\`\`\`
POST ${base}/api/oauth/register
Content-Type: application/json

{ "client_name": "Mi agente", "redirect_uris": ["https://tu-app.example/callback"] }
\`\`\`

Los \`redirect_uris\` deben ser HTTPS (o HTTP solo en loopback), con
coincidencia exacta después. Cliente público: sin \`client_secret\`.

## Flujo (OAuth 2.1)

1. \`GET ${base}/oauth/authorize\` con \`response_type=code\`, tu \`client_id\`,
   \`redirect_uri\`, \`state\` y PKCE (\`code_challenge\`, método \`S256\`
   obligatorio). El dueño del sitio inicia sesión y autoriza.
2. Canjea el código en \`POST ${base}/api/oauth/token\`
   (\`grant_type=authorization_code\` + \`code_verifier\`). Los códigos son de
   un solo uso.
3. Refresca con \`grant_type=refresh_token\` — hay **rotación**: cada refresh
   invalida el anterior, y reusar uno viejo revoca la familia completa.
4. Llama al MCP con \`Authorization: Bearer <access_token>\` (los tokens nunca
   van en la URL).

Descubrimiento completo: \`${base}/.well-known/oauth-authorization-server\`.

## Notas

- Los tokens se emiten con audiencia ligada al MCP: no sirven para otros
  recursos ni se aceptan tokens de terceros.
- Guía de uso de las tools: \`${base}/.well-known/agent-skills/reels-analytics-mcp/SKILL.md\`
`;

  return agentText(body);
}
