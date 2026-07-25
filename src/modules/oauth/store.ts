import "server-only";
import { createAdminClient } from "@/core/supabase/admin";
import {
  ACCESS_TTL_S,
  CODE_TTL_MS,
  REFRESH_TTL_S,
  SCOPE,
  resourceUrl,
} from "./config";
import { hashToken, randomToken } from "./tokens";

/**
 * Persistencia del authorization server (`ra_oauth_*`). Todo lo secreto se
 * guarda **hasheado**; los valores en claro solo viajan al cliente.
 *
 * Las operaciones de un solo uso (canje de code, rotación de refresh) se hacen
 * con un UPDATE condicional + RETURNING: si dos peticiones compiten, solo una
 * encuentra la fila sin consumir.
 */

export interface OAuthClient {
  clientId: string;
  clientName: string | null;
  redirectUris: string[];
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}

/** Contexto de un token de acceso válido (lo consume el resource server). */
export interface AccessContext {
  clientId: string;
  userId: string;
  scope: string;
  resource: string;
  expiresAt: Date;
}

export async function registerClient(input: {
  clientName: string | null;
  redirectUris: string[];
}): Promise<OAuthClient> {
  const supabase = createAdminClient();
  const clientId = randomToken(16);
  const { error } = await supabase.from("ra_oauth_clients").insert({
    client_id: clientId,
    client_name: input.clientName,
    redirect_uris: input.redirectUris,
  });
  if (error) throw new Error(`ra_oauth_clients: ${error.message}`);
  return {
    clientId,
    clientName: input.clientName,
    redirectUris: input.redirectUris,
  };
}

export async function getClient(clientId: string): Promise<OAuthClient | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ra_oauth_clients")
    .select("client_id, client_name, redirect_uris")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw new Error(`ra_oauth_clients: ${error.message}`);
  if (!data) return null;
  return {
    clientId: data.client_id,
    clientName: data.client_name,
    redirectUris: data.redirect_uris,
  };
}

/** Emite un authorization code (devuelve el valor en claro, se guarda el hash). */
export async function issueCode(input: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  resource: string;
  userId: string;
}): Promise<string> {
  const supabase = createAdminClient();
  const code = randomToken();
  const { error } = await supabase.from("ra_oauth_codes").insert({
    code_hash: hashToken(code),
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    code_challenge: input.codeChallenge,
    scope: input.scope,
    resource: input.resource,
    user_id: input.userId,
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  if (error) throw new Error(`ra_oauth_codes: ${error.message}`);
  return code;
}

export interface ConsumedCode {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  resource: string;
  userId: string;
}

/**
 * Canjea un code marcándolo consumido en el mismo UPDATE (un solo uso). Devuelve
 * `null` si no existe, ya se usó o expiró.
 */
export async function consumeCode(code: string): Promise<ConsumedCode | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ra_oauth_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("code_hash", hashToken(code))
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("client_id, redirect_uri, code_challenge, scope, resource, user_id")
    .maybeSingle();
  if (error) throw new Error(`ra_oauth_codes: ${error.message}`);
  if (!data) return null;
  return {
    clientId: data.client_id,
    redirectUri: data.redirect_uri,
    codeChallenge: data.code_challenge,
    scope: data.scope,
    resource: data.resource,
    userId: data.user_id,
  };
}

/** Emite el par access + refresh para un cliente/usuario. */
export async function issueTokens(input: {
  clientId: string;
  userId: string;
  scope: string;
  resource: string;
}): Promise<IssuedTokens> {
  const supabase = createAdminClient();
  const accessToken = randomToken();
  const refreshToken = randomToken();
  const now = Date.now();

  const common = {
    client_id: input.clientId,
    user_id: input.userId,
    scope: input.scope,
    resource: input.resource,
  };
  const { error } = await supabase.from("ra_oauth_tokens").insert([
    {
      ...common,
      token_hash: hashToken(accessToken),
      kind: "access" as const,
      expires_at: new Date(now + ACCESS_TTL_S * 1000).toISOString(),
    },
    {
      ...common,
      token_hash: hashToken(refreshToken),
      kind: "refresh" as const,
      expires_at: new Date(now + REFRESH_TTL_S * 1000).toISOString(),
    },
  ]);
  if (error) throw new Error(`ra_oauth_tokens: ${error.message}`);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TTL_S,
    scope: input.scope,
  };
}

/**
 * Rota un refresh token: revoca el presentado y emite un par nuevo (obligatorio
 * para clientes públicos). Devuelve `null` si el refresh no es válido.
 */
export async function rotateRefreshToken(
  refreshToken: string,
  clientId: string,
): Promise<IssuedTokens | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ra_oauth_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", hashToken(refreshToken))
    .eq("kind", "refresh")
    .eq("client_id", clientId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("client_id, user_id, scope, resource")
    .maybeSingle();
  if (error) throw new Error(`ra_oauth_tokens: ${error.message}`);
  if (!data) return null;

  const issued = await issueTokens({
    clientId: data.client_id,
    userId: data.user_id,
    scope: data.scope,
    resource: data.resource,
  });

  // Deja rastro de la cadena de rotación (auditoría).
  await supabase
    .from("ra_oauth_tokens")
    .update({ replaced_by: hashToken(issued.refreshToken) })
    .eq("token_hash", hashToken(refreshToken));

  return issued;
}

/**
 * Valida un access token para el resource server: debe existir, no estar
 * revocado ni expirado, y haber sido emitido **para este MCP** (audience).
 */
export async function lookupAccessToken(
  token: string,
): Promise<AccessContext | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ra_oauth_tokens")
    .select("client_id, user_id, scope, resource, expires_at")
    .eq("token_hash", hashToken(token))
    .eq("kind", "access")
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error(`ra_oauth_tokens: ${error.message}`);
  if (!data) return null;
  if (data.resource !== resourceUrl()) return null; // audience binding

  return {
    clientId: data.client_id,
    userId: data.user_id,
    scope: data.scope,
    resource: data.resource,
    expiresAt: new Date(data.expires_at),
  };
}

/** Scope por defecto que se concede al aprobar el consentimiento. */
export const GRANTED_SCOPE = SCOPE;
