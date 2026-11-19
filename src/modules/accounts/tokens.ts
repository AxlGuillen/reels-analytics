import "server-only";
import { env } from "@/core/config/env";
import type { Platform } from "@/core/domain";
import { createAdminClient } from "@/core/supabase/admin";
import { supabaseError } from "@/core/supabase/errors";
import {
  fetchUserInfo as fetchIgUserInfo,
  refreshLongLivedToken,
} from "@/modules/instagram/api";
import { refreshAccessToken, type TikTokTokens } from "@/modules/tiktok/oauth";
import type { TikTokAuth } from "@/modules/tiktok/read";

/**
 * Fuente de verdad de los tokens para trabajos de fondo (cron/ingesta):
 * `ra_connections`. Cada plataforma se refresca "antes de usar":
 *  - TikTok: access 24 h / refresh ~1 año (el refresh rota, se guarda el nuevo).
 *  - Instagram: token largo de ~60 días, extensible con `ig_refresh_token`.
 * Así el cron nunca depende de la cookie del navegador.
 *
 * Varias cuentas por plataforma: los tokens se resuelven POR CUENTA, nunca por
 * plataforma. Resolver por plataforma con `.limit(1)` y sin orden devolvía una
 * cuenta arbitraria en cuanto hubo dos, y podía cambiar entre corridas.
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

export interface ConnectedAccount {
  accountId: string;
  platform: Platform;
  externalId: string;
  /** null hasta la primera captura (el alta por OAuth solo conoce el open_id). */
  handle: string | null;
  isPrimary: boolean;
}

/** Nombre legible de una cuenta: el @handle si ya lo conocemos. */
export function accountLabel(account: {
  handle: string | null;
  externalId: string;
}): string {
  return account.handle ? `@${account.handle}` : account.externalId;
}

/**
 * Cuentas de la plataforma que tienen conexión guardada: las que el cron puede
 * capturar. Orden estable: la principal primero, luego por antigüedad.
 */
export async function listConnectedAccounts(
  platform: Platform,
): Promise<ConnectedAccount[]> {
  const supabase = createAdminClient();
  const { data: accounts, error } = await supabase
    .from("ra_social_accounts")
    .select("id, platform, external_id, handle, is_primary")
    .eq("platform", platform)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw supabaseError("ra_social_accounts", error);
  if (!accounts || accounts.length === 0) return [];

  const { data: conns, error: connErr } = await supabase
    .from("ra_connections")
    .select("account_id")
    .in(
      "account_id",
      accounts.map((a) => a.id),
    );
  if (connErr) throw supabaseError("ra_connections", connErr);
  const connected = new Set((conns ?? []).map((c) => c.account_id));

  return accounts
    .filter((a) => connected.has(a.id))
    .map((a) => ({
      accountId: a.id,
      platform: a.platform,
      externalId: a.external_id,
      handle: a.handle,
      isPrimary: a.is_primary,
    }));
}

async function connectionFor(
  supabase: Supabase,
  accountId: string,
): Promise<ConnectionRow | null> {
  const { data, error } = await supabase
    .from("ra_connections")
    .select("account_id, access_token, refresh_token, expires_at, refresh_expires_at")
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw supabaseError("ra_connections", error);
  return data ?? null;
}

/** Id de la cuenta principal de la plataforma (null si aún no hay cuentas). */
async function primaryAccountId(
  supabase: Supabase,
  platform: Platform,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("ra_social_accounts")
    .select("id")
    .eq("platform", platform)
    .eq("is_primary", true)
    .maybeSingle();
  if (error) throw supabaseError("ra_social_accounts", error);
  return data?.id ?? null;
}

// ---------------------------------------------------------------- TikTok

/**
 * Persiste (upsert) la cuenta y su conexión. Se llama en el callback de OAuth.
 * Devuelve si la cuenta es la principal: el callback lo usa para decidir si la
 * cookie de la UI debe apuntar a ella (ver `api/auth/tiktok/callback`). La
 * marca la decide la BD (trigger `ra_social_accounts_default_primary`): la
 * primera cuenta de la plataforma es principal; las siguientes, secundarias.
 */
export async function saveTikTokConnection(
  tokens: TikTokTokens,
): Promise<{ accountId: string; isPrimary: boolean }> {
  const supabase = createAdminClient();
  const now = Date.now();

  const { data: acct, error } = await supabase
    .from("ra_social_accounts")
    .upsert(
      { platform: "tiktok", external_id: tokens.openId },
      { onConflict: "platform,external_id" },
    )
    .select("id, is_primary")
    .single();
  if (error) throw supabaseError("ra_social_accounts", error, { fase: "oauth" });
  if (!acct) throw new Error("ra_social_accounts (tiktok): el upsert no devolvió id");

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
  if (connErr) throw supabaseError("ra_connections", connErr, { fase: "oauth" });

  return { accountId: acct.id, isPrimary: acct.is_primary };
}

/** Access token vigente de UNA cuenta de TikTok (refresca si hace falta). */
export async function getValidTikTokAccessToken(
  accountId: string,
): Promise<string | null> {
  const supabase = createAdminClient();
  const conn = await connectionFor(supabase, accountId);
  if (!conn) return null;

  const expiresAt = conn.expires_at ? Date.parse(conn.expires_at) : 0;
  if (expiresAt - Date.now() > TIKTOK_REFRESH_BUFFER_MS) {
    return conn.access_token;
  }
  if (!conn.refresh_token) return null;
  const refreshExp = conn.refresh_expires_at ? Date.parse(conn.refresh_expires_at) : 0;
  if (refreshExp && refreshExp < Date.now()) return null; // refresh token muerto → reconectar

  let tokens: TikTokTokens;
  try {
    tokens = await refreshAccessToken(conn.refresh_token);
  } catch {
    return null; // TikTok rechazó el refresh → reconectar
  }

  // TikTok ROTA el refresh token: si este update falla, el nuevo solo vive en
  // memoria y el guardado ya quedó invalidado, así que la próxima corrida
  // fallaría con un "reconecta" sin causa visible. Por eso falla ruidoso aquí.
  const now = Date.now();
  const { error } = await supabase
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
  if (error) throw supabaseError("ra_connections", error, { fase: "refresh" });
  return tokens.accessToken;
}

/**
 * Token listo para una lectura EN VIVO de la UI (/tiktok, detalle de video).
 * Sale de `ra_connections`, igual que el del cron: así la UI ve lo mismo que la
 * ingesta en cualquier navegador. Sin `accountId`, la cuenta principal.
 */
export async function resolveTikTokAuth(accountId?: string): Promise<TikTokAuth> {
  const supabase = createAdminClient();
  const id = accountId ?? (await primaryAccountId(supabase, "tiktok"));
  if (!id || !(await connectionFor(supabase, id))) {
    return { status: "disconnected" };
  }
  const accessToken = await getValidTikTokAccessToken(id);
  return accessToken ? { status: "ok", accessToken } : { status: "expired" };
}

/**
 * Token de la cuenta DUEÑA de un video. La Display API solo deja consultar un
 * video con el token de quien lo publicó, así que el de la principal no sirve
 * para uno de una cuenta secundaria. Si el video aún no está en `ra_videos`
 * (recién publicado, sin capturar), se intenta con la principal.
 */
export async function resolveTikTokAuthForVideo(
  externalId: string,
): Promise<TikTokAuth> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ra_videos")
    .select("account_id")
    .eq("platform", "tiktok")
    .eq("external_id", externalId)
    .maybeSingle();
  if (error) throw supabaseError("ra_videos", error);
  return resolveTikTokAuth(data?.account_id ?? undefined);
}

export type ConnectionState = "connected" | "expired" | "disconnected";

/**
 * Estado de la conexión de la cuenta principal, SOLO con fechas (sin llamar a
 * la plataforma ni refrescar): lo pinta el rail en cada render. "connected"
 * si el access token sigue vivo o hay un refresh vigente con que renovarlo —
 * exactamente lo que necesita el cron para capturar.
 */
export async function getPrimaryConnectionState(
  platform: Platform,
): Promise<ConnectionState> {
  const supabase = createAdminClient();
  const id = await primaryAccountId(supabase, platform);
  if (!id) return "disconnected";

  const { data, error } = await supabase
    .from("ra_connections")
    .select("expires_at, refresh_token, refresh_expires_at")
    .eq("account_id", id)
    .maybeSingle();
  if (error) throw supabaseError("ra_connections", error);
  if (!data) return "disconnected";

  const now = Date.now();
  const accessAlive = !!data.expires_at && Date.parse(data.expires_at) > now;
  const refreshAlive =
    !!data.refresh_token &&
    (!data.refresh_expires_at || Date.parse(data.refresh_expires_at) > now);
  return accessAlive || refreshAlive ? "connected" : "expired";
}

// ------------------------------------------------------------- Instagram
//
// Instagram sigue siendo de UNA cuenta: su token viene de la env var
// INSTAGRAM_ACCESS_TOKEN, no de un OAuth por cuenta. Sumar una 2.ª cuenta de IG
// exige primero el flujo OAuth de Instagram (ver docs/agregar-cuenta.md).

/** Siembra la conexión de IG desde la env var (interino, hasta tener OAuth). */
async function seedInstagramFromEnv(
  supabase: Supabase,
): Promise<ConnectionRow | null> {
  const token = env("INSTAGRAM_ACCESS_TOKEN");
  if (!token) return null;

  // Reusar la cuenta principal de IG si ya existe (la creó la ingesta); si no,
  // crearla — el trigger la marca como principal por ser la primera.
  let accountId = await primaryAccountId(supabase, "instagram");
  if (!accountId) {
    const user = await fetchIgUserInfo(token);
    const { data: acct, error } = await supabase
      .from("ra_social_accounts")
      .upsert(
        { platform: "instagram", external_id: user.user_id },
        { onConflict: "platform,external_id" },
      )
      .select("id")
      .single();
    if (error) throw supabaseError("ra_social_accounts", error, { fase: "seed" });
    accountId = acct?.id ?? null;
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
  const { error: connErr } = await supabase
    .from("ra_connections")
    .upsert(
      { account_id: accountId, access_token: accessToken, expires_at: expiresAt },
      { onConflict: "account_id" },
    );
  if (connErr) throw supabaseError("ra_connections", connErr, { fase: "seed" });
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
  const accountId = await primaryAccountId(supabase, "instagram");
  const conn =
    (accountId ? await connectionFor(supabase, accountId) : null) ??
    (await seedInstagramFromEnv(supabase));
  if (!conn) return null;

  const expiresAt = conn.expires_at ? Date.parse(conn.expires_at) : 0;
  if (expiresAt && expiresAt - Date.now() > IG_REFRESH_BUFFER_MS) {
    return conn.access_token;
  }

  let refreshed: Awaited<ReturnType<typeof refreshLongLivedToken>>;
  try {
    refreshed = await refreshLongLivedToken(conn.access_token);
  } catch {
    // Refresh falló: usar el token actual como último recurso (el error real
    // aflorará en la llamada de datos si de verdad está muerto).
    return conn.access_token;
  }
  const { error } = await supabase
    .from("ra_connections")
    .update({
      access_token: refreshed.accessToken,
      expires_at: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
    })
    .eq("account_id", conn.account_id);
  if (error) throw supabaseError("ra_connections", error, { fase: "refresh" });
  return refreshed.accessToken;
}
