import "server-only";
import { env } from "@/core/config/env";
import type { Platform } from "@/core/domain";
import { createAdminClient } from "@/core/supabase/admin";
import {
  fetchUserInfo as fetchIgUserInfo,
  refreshLongLivedToken,
} from "@/modules/instagram/api";
import { refreshAccessToken, type TikTokTokens } from "@/modules/tiktok/oauth";

/**
 * Fuente de verdad de los tokens para trabajos de fondo (cron/ingesta):
 * `ra_connections`. Cada plataforma se refresca "antes de usar":
 *  - TikTok: access 24 h / refresh ~1 año (el refresh rota, se guarda el nuevo).
 *  - Instagram: token largo de ~60 días, extensible con `ig_refresh_token`.
 * Así el cron nunca depende de la cookie del navegador.
 */

type Supabase = ReturnType<typeof createAdminClient>;

/** Refresca TikTok si al access token le queda menos de 1 h. */
const TIKTOK_REFRESH_BUFFER_MS = 60 * 60 * 1000;
/** Refresca Instagram si al token le quedan menos de 10 días. */
const IG_REFRESH_BUFFER_MS = 10 * 24 * 60 * 60 * 1000;

interface ConnectionRow {
  account_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  refresh_expires_at: string | null;
}

async function getConnection(
  supabase: Supabase,
  platform: Platform,
): Promise<ConnectionRow | null> {
  const { data: accounts } = await supabase
    .from("ra_social_accounts")
    .select("id")
    .eq("platform", platform)
    .limit(1);
  const accountId = accounts?.[0]?.id;
  if (!accountId) return null;

  const { data } = await supabase
    .from("ra_connections")
    .select("account_id, access_token, refresh_token, expires_at, refresh_expires_at")
    .eq("account_id", accountId)
    .maybeSingle();
  return data ?? null;
}

// ---------------------------------------------------------------- TikTok

/** Persiste (upsert) la cuenta y su conexión. Se llama en el callback de OAuth. */
export async function saveTikTokConnection(tokens: TikTokTokens): Promise<void> {
  const supabase = createAdminClient();
  const now = Date.now();

  const { data: acct, error } = await supabase
    .from("ra_social_accounts")
    .upsert(
      { platform: "tiktok", external_id: tokens.openId },
      { onConflict: "platform,external_id" },
    )
    .select("id")
    .single();
  if (error || !acct) {
    throw new Error(`ra_social_accounts (tiktok): ${error?.message ?? "sin id"}`);
  }

  const { error: connErr } = await supabase.from("ra_connections").upsert(
    {
      account_id: acct.id,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: new Date(now + tokens.expiresIn * 1000).toISOString(),
      refresh_expires_at: new Date(now + tokens.refreshExpiresIn * 1000).toISOString(),
      scope: tokens.scope,
    },
    { onConflict: "account_id" },
  );
  if (connErr) throw new Error(`ra_connections (tiktok): ${connErr.message}`);
}

export async function getValidTikTokAccessToken(): Promise<string | null> {
  const supabase = createAdminClient();
  const conn = await getConnection(supabase, "tiktok");
  if (!conn) return null;

  const expiresAt = conn.expires_at ? Date.parse(conn.expires_at) : 0;
  if (expiresAt - Date.now() > TIKTOK_REFRESH_BUFFER_MS) {
    return conn.access_token;
  }
  if (!conn.refresh_token) return null;
  const refreshExp = conn.refresh_expires_at ? Date.parse(conn.refresh_expires_at) : 0;
  if (refreshExp && refreshExp < Date.now()) return null; // refresh token muerto → reconectar

  try {
    const tokens = await refreshAccessToken(conn.refresh_token);
    const now = Date.now();
    await supabase
      .from("ra_connections")
      .update({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken || conn.refresh_token,
        expires_at: new Date(now + tokens.expiresIn * 1000).toISOString(),
        refresh_expires_at: tokens.refreshExpiresIn
          ? new Date(now + tokens.refreshExpiresIn * 1000).toISOString()
          : conn.refresh_expires_at,
      })
      .eq("account_id", conn.account_id);
    return tokens.accessToken;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------- Instagram

/** Siembra la conexión de IG desde la env var (interino, hasta tener OAuth). */
async function seedInstagramFromEnv(
  supabase: Supabase,
): Promise<ConnectionRow | null> {
  const token = env("INSTAGRAM_ACCESS_TOKEN");
  if (!token) return null;

  // Reusar la cuenta de IG si ya existe (la creó la ingesta); si no, crearla.
  const { data: existing } = await supabase
    .from("ra_social_accounts")
    .select("id")
    .eq("platform", "instagram")
    .limit(1);
  let accountId = existing?.[0]?.id;
  if (!accountId) {
    const user = await fetchIgUserInfo(token);
    const { data: acct } = await supabase
      .from("ra_social_accounts")
      .upsert(
        { platform: "instagram", external_id: user.user_id },
        { onConflict: "platform,external_id" },
      )
      .select("id")
      .single();
    accountId = acct?.id;
  }
  if (!accountId) return null;

  // Intentar refresh para tener un expiry conocido; si falla, guardar tal cual.
  let accessToken = token;
  let expiresIn = 60 * 24 * 60 * 60;
  try {
    const refreshed = await refreshLongLivedToken(token);
    accessToken = refreshed.accessToken;
    expiresIn = refreshed.expiresIn;
  } catch {
    // token muy nuevo (<24 h) o no refrescable: se usa como está
  }
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  await supabase
    .from("ra_connections")
    .upsert(
      { account_id: accountId, access_token: accessToken, expires_at: expiresAt },
      { onConflict: "account_id" },
    );
  return {
    account_id: accountId,
    access_token: accessToken,
    refresh_token: null,
    expires_at: expiresAt,
    refresh_expires_at: null,
  };
}

export async function getValidInstagramAccessToken(): Promise<string | null> {
  const supabase = createAdminClient();
  const conn =
    (await getConnection(supabase, "instagram")) ??
    (await seedInstagramFromEnv(supabase));
  if (!conn) return null;

  const expiresAt = conn.expires_at ? Date.parse(conn.expires_at) : 0;
  if (expiresAt && expiresAt - Date.now() > IG_REFRESH_BUFFER_MS) {
    return conn.access_token;
  }

  try {
    const refreshed = await refreshLongLivedToken(conn.access_token);
    await supabase
      .from("ra_connections")
      .update({
        access_token: refreshed.accessToken,
        expires_at: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
      })
      .eq("account_id", conn.account_id);
    return refreshed.accessToken;
  } catch {
    // Refresh falló: usar el token actual como último recurso (el error real
    // aflorará en la llamada de datos si de verdad está muerto).
    return conn.access_token;
  }
}
