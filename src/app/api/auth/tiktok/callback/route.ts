import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForToken } from "@/modules/tiktok/oauth";
import { consumeHandshake, saveSession } from "@/modules/tiktok/session";

export const runtime = "nodejs";

/**
 * Callback de TikTok: valida el `state`, intercambia el `code` por tokens
 * (con el PKCE verifier guardado) y persiste la sesión interina.
 */
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  // Al terminar el OAuth aterrizamos en el dashboard de TikTok.
  const dashboard = (params: string) =>
    NextResponse.redirect(new URL(`/tiktok${params}`, origin));

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const { state: savedState, verifier } = await consumeHandshake();

  if (oauthError) {
    const description = searchParams.get("error_description") ?? oauthError;
    return dashboard(`?error=${encodeURIComponent(description)}`);
  }
  if (!code || !returnedState) {
    return dashboard(`?error=${encodeURIComponent("Respuesta de TikTok incompleta")}`);
  }
  if (!savedState || returnedState !== savedState) {
    return dashboard(`?error=${encodeURIComponent("State inválido (posible CSRF)")}`);
  }
  if (!verifier) {
    return dashboard(`?error=${encodeURIComponent("Falta el verifier PKCE; reintenta")}`);
  }

  try {
    const tokens = await exchangeCodeForToken(code, verifier);
    await saveSession(tokens);
    return dashboard(`?connected=1`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "error desconocido";
    return dashboard(`?error=${encodeURIComponent(message)}`);
  }
}
