import crypto from "node:crypto";
import { requireEnv } from "@/core/config/env";

/**
 * Flujo OAuth 2.0 de TikTok — Login Kit (Display API).
 *
 * Docs: https://developers.tiktok.com/doc/login-kit-web/
 *       https://developers.tiktok.com/doc/login-kit-manage-user-access-tokens/
 *
 * Usa PKCE (code_challenge S256) + `state` para mitigar CSRF. Este módulo es
 * agnóstico del framework; los route handlers de Next solo lo orquestan.
 */

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

/** Scopes que pedimos (deben estar habilitados en la app del portal). */
export const TIKTOK_SCOPES = [
  "user.info.basic",
  "user.info.profile",
  "user.info.stats",
  "video.list",
] as const;

export interface Pkce {
  verifier: string;
  challenge: string;
}

/** Genera el par PKCE (verifier secreto + challenge público S256). */
export function generatePkce(): Pkce {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

/** Valor `state` aleatorio para validar el retorno del callback. */
export function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

/** Construye la URL de consentimiento a la que redirigimos al usuario. */
export function buildAuthorizeUrl(params: {
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_key", requireEnv("TIKTOK_CLIENT_KEY"));
  url.searchParams.set("scope", TIKTOK_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", requireEnv("TIKTOK_REDIRECT_URI"));
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/** Tokens normalizados que devuelve el intercambio/refresh. */
export interface TikTokTokens {
  accessToken: string;
  refreshToken: string;
  /** segundos de vida del access token. */
  expiresIn: number;
  /** segundos de vida del refresh token. */
  refreshExpiresIn: number;
  /** id opaco del usuario en TikTok. */
  openId: string;
  scope: string;
}

interface TikTokTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

function mapTokenResponse(json: TikTokTokenResponse): TikTokTokens {
  return {
    accessToken: json.access_token ?? "",
    refreshToken: json.refresh_token ?? "",
    expiresIn: json.expires_in ?? 0,
    refreshExpiresIn: json.refresh_expires_in ?? 0,
    openId: json.open_id ?? "",
    scope: json.scope ?? "",
  };
}

async function postToken(
  body: URLSearchParams,
  context: string,
): Promise<TikTokTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const json = (await res.json()) as TikTokTokenResponse;
  if (!res.ok || json.error) {
    throw new Error(
      `TikTok ${context} falló: ${json.error ?? res.status} ${
        json.error_description ?? ""
      }`.trim(),
    );
  }
  return mapTokenResponse(json);
}

/** Intercambia el `code` del callback por tokens de acceso. */
export function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
): Promise<TikTokTokens> {
  const body = new URLSearchParams({
    client_key: requireEnv("TIKTOK_CLIENT_KEY"),
    client_secret: requireEnv("TIKTOK_CLIENT_SECRET"),
    code,
    grant_type: "authorization_code",
    redirect_uri: requireEnv("TIKTOK_REDIRECT_URI"),
    code_verifier: codeVerifier,
  });
  return postToken(body, "intercambio de code");
}

/** Renueva el access token usando el refresh token. */
export function refreshAccessToken(refreshToken: string): Promise<TikTokTokens> {
  const body = new URLSearchParams({
    client_key: requireEnv("TIKTOK_CLIENT_KEY"),
    client_secret: requireEnv("TIKTOK_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return postToken(body, "refresh de token");
}
