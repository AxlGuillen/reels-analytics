import { consumeCode, rotateRefreshToken, issueTokens } from "@/modules/oauth/store";
import { oauthHeaders } from "@/modules/oauth/config";
import { redirectUriMatches, verifyPkceS256 } from "@/modules/oauth/tokens";
import type { IssuedTokens } from "@/modules/oauth/store";

export const runtime = "nodejs";

const CORS = oauthHeaders({
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // OAuth 2.1: las respuestas con tokens nunca se cachean.
  "Cache-Control": "no-store",
  Pragma: "no-cache",
});

function fail(code: string, description: string, status = 400) {
  return new Response(
    JSON.stringify({ error: code, error_description: description }),
    { status, headers: CORS },
  );
}

function tokenResponse(issued: IssuedTokens) {
  return new Response(
    JSON.stringify({
      access_token: issued.accessToken,
      token_type: "Bearer",
      expires_in: issued.expiresIn,
      refresh_token: issued.refreshToken,
      scope: issued.scope,
    }),
    { headers: CORS },
  );
}

/**
 * Token endpoint (OAuth 2.1). Soporta `authorization_code` (con PKCE) y
 * `refresh_token` (con **rotación**: el refresh presentado queda revocado).
 *
 * Los fallos de canje se responden todos como `invalid_grant` a propósito: no
 * distinguir "no existe" de "PKCE incorrecto" evita dar pistas a un atacante.
 */
export async function POST(request: Request) {
  let form: URLSearchParams;
  try {
    form = new URLSearchParams(await request.text());
  } catch {
    return fail("invalid_request", "Se esperaba application/x-www-form-urlencoded.");
  }

  const grantType = form.get("grant_type");
  const clientId = form.get("client_id");
  if (!clientId) return fail("invalid_client", "Falta `client_id`.", 401);

  if (grantType === "authorization_code") {
    const code = form.get("code");
    const redirectUri = form.get("redirect_uri");
    const codeVerifier = form.get("code_verifier");
    if (!code || !redirectUri || !codeVerifier) {
      return fail(
        "invalid_request",
        "Faltan `code`, `redirect_uri` o `code_verifier`.",
      );
    }

    // Canje de un solo uso: si ya se usó o expiró, aquí sale null. Se marca
    // consumido ANTES de verificar PKCE a propósito: así un intento fallido
    // quema el code y no se puede probar el `code_verifier` por fuerza bruta.
    const consumed = await consumeCode(code);
    if (
      !consumed ||
      consumed.clientId !== clientId ||
      !redirectUriMatches([consumed.redirectUri], redirectUri) ||
      !verifyPkceS256(codeVerifier, consumed.codeChallenge)
    ) {
      return fail("invalid_grant", "El authorization code no es válido.");
    }

    return tokenResponse(
      await issueTokens({
        clientId: consumed.clientId,
        userId: consumed.userId,
        scope: consumed.scope,
        resource: consumed.resource,
      }),
    );
  }

  if (grantType === "refresh_token") {
    const refreshToken = form.get("refresh_token");
    if (!refreshToken) return fail("invalid_request", "Falta `refresh_token`.");

    const issued = await rotateRefreshToken(refreshToken, clientId);
    if (!issued) return fail("invalid_grant", "El refresh token no es válido.");
    return tokenResponse(issued);
  }

  return fail("unsupported_grant_type", `grant_type no soportado: ${grantType}`);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
