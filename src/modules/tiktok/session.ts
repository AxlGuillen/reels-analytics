import { cookies } from "next/headers";

/**
 * Cookies del handshake OAuth de TikTok (state + PKCE verifier): efímeras, de
 * uso único, viven solo entre el login y el callback.
 *
 * Aquí vivía también una cookie `tiktok_session` con los tokens, de la que
 * leían la vista en vivo de /tiktok, el detalle de video, el rail y Conexiones.
 * Era interina hasta tener Supabase y tenía dos defectos: solo existía en el
 * navegador donde se conectó (en otro, todo decía "sin conectar" aunque la
 * ingesta funcionara) y nunca se refrescaba, así que caducaba a las 24 h junto
 * con el access token. Los tokens viven ahora SOLO en `ra_connections`
 * (`modules/accounts/tokens.ts`), de donde leen el cron y la UI por igual.
 */

const LEGACY_SESSION_COOKIE = "tiktok_session";
export const STATE_COOKIE = "tiktok_oauth_state";
export const VERIFIER_COOKIE = "tiktok_oauth_verifier";

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

/**
 * Borra la cookie de sesión vieja si el navegador aún la tiene. Nadie la lee
 * ya, pero guardaba access y refresh token: no tiene por qué quedarse.
 */
export async function clearLegacySession(): Promise<void> {
  const jar = await cookies();
  if (jar.has(LEGACY_SESSION_COOKIE)) jar.delete(LEGACY_SESSION_COOKIE);
}

/** Guarda los valores efímeros del handshake OAuth (state + PKCE verifier). */
export async function saveHandshake(
  state: string,
  verifier: string,
): Promise<void> {
  const jar = await cookies();
  const opts = { ...baseCookieOptions(), maxAge: 600 };
  jar.set(STATE_COOKIE, state, opts);
  jar.set(VERIFIER_COOKIE, verifier, opts);
}

/** Lee y borra los valores del handshake (uso único). */
export async function consumeHandshake(): Promise<{
  state: string | undefined;
  verifier: string | undefined;
}> {
  const jar = await cookies();
  const state = jar.get(STATE_COOKIE)?.value;
  const verifier = jar.get(VERIFIER_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  jar.delete(VERIFIER_COOKIE);
  return { state, verifier };
}
