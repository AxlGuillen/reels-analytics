import { cookies } from "next/headers";
import type { Connection } from "@/core/domain";
import type { TikTokTokens } from "./oauth";

/**
 * Almacenamiento INTERINO de la sesión de TikTok en una cookie httpOnly.
 *
 * Es temporal: cuando montemos Supabase, los tokens se persistirán ahí cifrados
 * (tabla `connections`) y esto se reemplazará. Sirve para probar el flujo de
 * conexión de punta a punta con una sola cuenta en desarrollo.
 */

const SESSION_COOKIE = "tiktok_session";
export const STATE_COOKIE = "tiktok_oauth_state";
export const VERIFIER_COOKIE = "tiktok_oauth_verifier";

export interface TikTokSession {
  accessToken: string;
  refreshToken: string;
  openId: string;
  scope: string;
  /** epoch ms en que expira el access token. */
  expiresAt: number;
  /** epoch ms en que expira el refresh token. */
  refreshExpiresAt: number;
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

/** Guarda los tokens recién obtenidos como sesión. */
export async function saveSession(tokens: TikTokTokens): Promise<void> {
  const now = Date.now();
  const session: TikTokSession = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    openId: tokens.openId,
    scope: tokens.scope,
    expiresAt: now + tokens.expiresIn * 1000,
    refreshExpiresAt: now + tokens.refreshExpiresIn * 1000,
  };
  const jar = await cookies();
  jar.set(SESSION_COOKIE, JSON.stringify(session), {
    ...baseCookieOptions(),
    maxAge: tokens.refreshExpiresIn || 60 * 60 * 24 * 30,
  });
}

/** Lee la sesión actual, o null si no hay conexión. */
export async function getSession(): Promise<TikTokSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TikTokSession;
  } catch {
    return null;
  }
}

/** Cierra la conexión de TikTok. */
export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** ¿El access token ya expiró? */
export function isExpired(session: TikTokSession): boolean {
  return Date.now() >= session.expiresAt;
}

/** Construye la `Connection` que consumen los providers a partir de la sesión. */
export function toConnection(session: TikTokSession): Connection {
  return {
    platform: "tiktok",
    externalAccountId: session.openId,
    accessToken: session.accessToken,
  };
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
