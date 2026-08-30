import { requireEnv } from "./env";

/**
 * Identidad pública de la app, derivada de `APP_URL` (fija por env, nunca del
 * header Host, que es spoofable). Vive en `core/` porque la consumen varios
 * módulos (`oauth`, `mcp`, `health`) y la regla de arquitectura prohíbe
 * imports entre módulos hermanos.
 */

/** Origen público sin barra final. */
export function appUrl(): string {
  return requireEnv("APP_URL").replace(/\/+$/, "");
}

/** Issuer OAuth (= origen de la app). */
export function issuer(): string {
  return appUrl();
}

/**
 * URI canónica del MCP (RFC 8707). Es el `aud` de los tokens: el resource
 * server rechaza cualquier token emitido para otro recurso.
 */
export function resourceUrl(): string {
  return `${appUrl()}/api/mcp`;
}

/** Único scope OAuth: los tools del MCP son de solo lectura. */
export const SCOPE = "analytics:read";

/** Ruta del documento de Protected Resource Metadata (RFC 9728). */
export const PROTECTED_RESOURCE_PATH = "/.well-known/oauth-protected-resource";
