import crypto from "node:crypto";

/**
 * Primitivas puras del authorization server: generación/hasheo de tokens,
 * verificación de PKCE y validación de `redirect_uri`.
 *
 * Sin env, sin BD y sin red → testeable directo. Los tokens se emiten opacos y
 * en la BD solo vive su **hash** (si alguien lee la tabla, no puede usarlos).
 */

/** Token opaco aleatorio en base64url (32 bytes ≈ 256 bits de entropía). */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** Hash con el que se guarda/busca un token o code. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("base64url");
}

/** Comparación en tiempo constante (evita filtrar el valor por timing). */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifica PKCE S256: `challenge` debe ser base64url(sha256(verifier)).
 * Solo se acepta S256 (el spec de MCP prohíbe `plain`).
 */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!verifier || !challenge) return false;
  const computed = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return safeEqual(computed, challenge);
}

/**
 * `redirect_uri` aceptable según OAuth 2.1: HTTPS, o HTTP **solo** en loopback
 * (clientes nativos). Se rechazan fragmentos y cualquier otro esquema.
 */
export function isValidRedirectUri(uri: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }
  if (parsed.hash) return false;
  if (parsed.protocol === "https:") return true;
  if (parsed.protocol === "http:") {
    return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(parsed.hostname);
  }
  return false;
}

/**
 * Coincidencia **exacta** contra las URIs registradas (el spec lo exige: nada de
 * prefijos ni comodines, para evitar open redirect).
 */
export function redirectUriMatches(
  registered: readonly string[],
  candidate: string,
): boolean {
  return registered.some((uri) => safeEqual(uri, candidate));
}
