import { NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  generatePkce,
  generateState,
} from "@/modules/tiktok/oauth";
import { saveHandshake } from "@/modules/tiktok/session";

export const runtime = "nodejs";

/**
 * Inicia el login de TikTok: genera state + PKCE, los guarda en cookies
 * efímeras y redirige a la pantalla de consentimiento de TikTok.
 */
export async function GET() {
  try {
    const state = generateState();
    const { verifier, challenge } = generatePkce();
    await saveHandshake(state, verifier);
    const authorizeUrl = buildAuthorizeUrl({ state, codeChallenge: challenge });
    return NextResponse.redirect(authorizeUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.redirect(
      new URL(
        `/tiktok?error=${encodeURIComponent(message)}`,
        process.env.TIKTOK_REDIRECT_URI ?? "http://localhost:3000",
      ),
    );
  }
}
