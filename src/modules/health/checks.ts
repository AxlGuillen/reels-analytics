import "server-only";
import type { Platform } from "@/core/domain";
import { createAdminClient } from "@/core/supabase/admin";
import { authorizationServerMetadata, appUrl } from "@/modules/oauth/config";
import { listConnectedClients } from "@/modules/oauth/store";
import { getCaptureStatus, STALE_AFTER_HOURS } from "@/modules/ingestion/status";
import type { Check } from "./status";

/**
 * Chequeos de salud de la app, pensados para un monitor externo diario.
 * El rollup y los tipos viven en `status.ts` (parte pura, testeable).
 *
 * Reglas del módulo:
 *  - Nunca expone secretos: de los tokens de plataforma solo salen FECHAS.
 *  - Ningún check puede colgar la respuesta (todos con timeout y `allSettled`):
 *    un endpoint de salud que se cuelga es peor que uno que reporta mal.
 *  - `warn` = algo que hay que mirar pronto (ingesta atrasada, token por vencer);
 *    `fail` = está roto de verdad. Solo `fail` degrada el HTTP a 503.
 */

/** Margen para avisar de un token antes de que caduque. */
const TOKEN_WARN_DAYS = 7;
/** Tope de cada self-fetch: el health debe responder rápido siempre. */
const FETCH_TIMEOUT_MS = 5_000;

function hoursSince(date: Date): number {
  return Math.round(((Date.now() - date.getTime()) / 3_600_000) * 10) / 10;
}

/** La BD responde: si esto falla, no hay nada que reportar. */
async function checkDatabase(): Promise<Check> {
  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from("ra_social_accounts")
    .select("id", { count: "exact", head: true });
  if (error) {
    return { name: "database", status: "fail", detail: error.message };
  }
  return {
    name: "database",
    status: "ok",
    detail: "Supabase responde.",
    meta: { accounts: count ?? 0 },
  };
}

/**
 * El render del dashboard vive. Se pide `/login` porque es la única página
 * pública; si devolviera 500, la app estaría arriba pero inservible.
 */
async function checkPage(): Promise<Check> {
  const url = `${appUrl()}/login`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "reels-analytics-health" },
  });
  const body = await response.text();
  if (!response.ok) {
    return {
      name: "page",
      status: "fail",
      detail: `/login respondió ${response.status}`,
    };
  }
  if (!body.includes("<html")) {
    return { name: "page", status: "fail", detail: "/login no devolvió HTML" };
  }
  return { name: "page", status: "ok", detail: "El login renderiza." };
}

/**
 * El servidor MCP vive y anuncia OAuth correctamente: sin token debe responder
 * 401 **con `WWW-Authenticate` + `resource_metadata`**. Un 401 pelón dejaría a
 * los conectores remotos sin poder descubrir el authorization server (justo la
 * regresión que ya nos pasó), así que aquí cuenta como fallo.
 */
async function checkMcp(): Promise<Check> {
  // Si falta APP_URL esto lanza y el check sale como fail: es la señal correcta.
  const metadata = authorizationServerMetadata();

  const response = await fetch(`${appUrl()}/api/mcp`, {
    method: "POST",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
  });

  if (response.status !== 401) {
    return {
      name: "mcp",
      status: "fail",
      detail: `Sin token se esperaba 401 y respondió ${response.status}`,
    };
  }
  const challenge = response.headers.get("www-authenticate") ?? "";
  if (!challenge.includes("resource_metadata")) {
    return {
      name: "mcp",
      status: "fail",
      detail: "El 401 no trae `resource_metadata`: los conectores no podrían descubrir OAuth.",
    };
  }
  return {
    name: "mcp",
    status: "ok",
    detail: "Responde 401 con descubrimiento OAuth.",
    meta: { issuer: metadata.issuer },
  };
}

/** ¿Sigue guardando snapshots el cron? */
async function checkIngestion(platform: Platform): Promise<Check> {
  const status = await getCaptureStatus(platform);
  const name = `ingestion.${platform}`;
  if (!status.lastCaptureAt) {
    return { name, status: "warn", detail: "Nunca ha capturado." };
  }
  const hours = hoursSince(status.lastCaptureAt);
  return {
    name,
    status: status.stale ? "warn" : "ok",
    detail: status.stale
      ? `Sin capturar hace ${hours} h (umbral ${STALE_AFTER_HOURS} h).`
      : `Última captura hace ${hours} h.`,
    meta: { lastCaptureAt: status.lastCaptureAt.toISOString(), hours },
  };
}

/**
 * Caducidad de los tokens de plataforma. Solo se leen FECHAS: el token nunca
 * sale de la BD. Avisa antes de que se rompa la ingesta, no después.
 */
async function checkPlatformToken(platform: Platform): Promise<Check> {
  const supabase = createAdminClient();
  const name = `tokens.${platform}`;

  const { data: accounts } = await supabase
    .from("ra_social_accounts")
    .select("id")
    .eq("platform", platform);
  const ids = (accounts ?? []).map((a) => a.id);
  if (ids.length === 0) {
    return { name, status: "warn", detail: "Sin cuenta conectada." };
  }

  // Hoy es single-user (una conexión por plataforma), pero sin `order` la fila
  // elegida sería arbitraria y una duplicada vieja reportaría la expiración
  // equivocada. Se toma la de expiración más lejana = la vigente; `nullsFirst`
  // en false porque en Postgres un DESC pone los NULL primero.
  const { data } = await supabase
    .from("ra_connections")
    .select("expires_at, refresh_expires_at")
    .in("account_id", ids)
    .order("expires_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!data) {
    return { name, status: "warn", detail: "Sin conexión guardada." };
  }

  // TikTok se auto-refresca, así que lo que importa es el refresh; Instagram
  // usa un token largo que hay que renovar a mano.
  const relevant = data.refresh_expires_at ?? data.expires_at;
  if (!relevant) {
    return { name, status: "ok", detail: "Sin fecha de expiración registrada." };
  }

  const expiresAt = new Date(relevant);
  const days = Math.round((expiresAt.getTime() - Date.now()) / 86_400_000);
  const meta = { expiresAt: expiresAt.toISOString(), days };

  if (days <= 0) return { name, status: "warn", detail: "Token vencido.", meta };
  if (days <= TOKEN_WARN_DAYS) {
    return { name, status: "warn", detail: `Vence en ${days} días.`, meta };
  }
  return { name, status: "ok", detail: `Vence en ${days} días.`, meta };
}

/** Cuántos conectores OAuth siguen vivos (informativo). */
async function checkConnectors(): Promise<Check> {
  const clients = await listConnectedClients();
  const active = clients.filter((c) => c.activeTokens > 0).length;
  return {
    name: "mcp.connectors",
    status: "ok",
    detail: `${active} conector(es) con tokens vigentes.`,
    meta: { active, registered: clients.length },
  };
}

/**
 * Corre todos los checks en paralelo. Un check que lanza se reporta como `fail`
 * con su mensaje en vez de tumbar la respuesta.
 */
export async function runChecks(): Promise<Check[]> {
  const jobs: { name: string; run: () => Promise<Check> }[] = [
    { name: "database", run: checkDatabase },
    { name: "page", run: checkPage },
    { name: "mcp", run: checkMcp },
    { name: "ingestion.tiktok", run: () => checkIngestion("tiktok") },
    { name: "ingestion.instagram", run: () => checkIngestion("instagram") },
    { name: "tokens.tiktok", run: () => checkPlatformToken("tiktok") },
    { name: "tokens.instagram", run: () => checkPlatformToken("instagram") },
    { name: "mcp.connectors", run: checkConnectors },
  ];

  const settled = await Promise.allSettled(jobs.map((job) => job.run()));
  return settled.map((result, i) =>
    result.status === "fulfilled"
      ? result.value
      : {
          name: jobs[i].name,
          status: "fail" as const,
          detail:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        },
  );
}
