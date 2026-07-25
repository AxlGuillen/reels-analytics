import { requireEnv } from "@/core/config/env";

/**
 * Identidades y tiempos del authorization server. El issuer y el `resource` se
 * derivan de `APP_URL` (fijo por env, nunca del header Host, que es spoofable):
 * si cambiaran entre peticiones, los tokens dejarían de validar.
 */

/** Único scope: los tools del MCP son de solo lectura. */
export const SCOPE = "analytics:read";

/** Vida de cada credencial. Access corto + refresh rotativo (OAuth 2.1). */
export const CODE_TTL_MS = 60_000; // 1 min: solo para canjearlo
export const ACCESS_TTL_S = 60 * 60; // 1 h
export const REFRESH_TTL_S = 30 * 24 * 60 * 60; // 30 días

/** Origen público sin barra final. */
export function appUrl(): string {
  return requireEnv("APP_URL").replace(/\/+$/, "");
}

/** Issuer OAuth (= origen de la app). */
export function issuer(): string {
  return appUrl();
}

/**
 * URI canónica del MCP (RFC 8707). Es el `aud` de los tokens: el resource server
 * rechaza cualquier token emitido para otro recurso.
 */
export function resourceUrl(): string {
  return `${appUrl()}/api/mcp`;
}

/** Ruta del documento de Protected Resource Metadata (RFC 9728). */
export const PROTECTED_RESOURCE_PATH = "/.well-known/oauth-protected-resource";

/**
 * Cabeceras de los endpoints públicos de OAuth. Son públicos por diseño
 * (descubrimiento y máquina-a-máquina), así que van con CORS abierto; cada ruta
 * añade su `Allow-Methods` y su política de caché.
 */
export function oauthHeaders(extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...extra,
  };
}

/** Documento RFC 8414 que anuncia las capacidades del authorization server. */
export function authorizationServerMetadata() {
  const base = appUrl();
  return {
    issuer: issuer(),
    // Es una página (no /api): necesita renderizar la pantalla de consentimiento.
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    scopes_supported: [SCOPE],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    // Sin esto los clientes MCP deben abortar: es como anuncian que hay PKCE.
    code_challenge_methods_supported: ["S256"],
    // Cliente público: no hay client_secret que presentar en /token.
    token_endpoint_auth_methods_supported: ["none"],
  };
}
