import {
  appUrl,
  issuer,
  PROTECTED_RESOURCE_PATH,
  resourceUrl,
  SCOPE,
} from "@/core/config/app";

/**
 * Tiempos y metadata del authorization server. La identidad (appUrl/issuer/
 * resource/scope) vive en `core/config/app` — la consumen otros módulos y los
 * módulos hermanos no pueden importarse entre sí. Se re-exporta desde aquí para
 * los consumidores de `app/` que ya la importaban de este módulo.
 */
export { appUrl, issuer, PROTECTED_RESOURCE_PATH, resourceUrl, SCOPE };

/** Vida de cada credencial. Access corto + refresh rotativo (OAuth 2.1). */
export const CODE_TTL_MS = 60_000; // 1 min: solo para canjearlo
export const ACCESS_TTL_S = 60 * 60; // 1 h
export const REFRESH_TTL_S = 30 * 24 * 60 * 60; // 30 días

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
    // Bloque de auth.md (workos/auth.md): registro para agentes. Solo campos
    // que tenemos de verdad; claim/revocación no existen y se omiten.
    agent_auth: {
      registration_endpoint: `${base}/api/oauth/register`,
      documentation: `${base}/auth.md`,
      identity_types: ["url"],
      credential_types: ["oauth2_authorization_code"],
    },
  };
}
