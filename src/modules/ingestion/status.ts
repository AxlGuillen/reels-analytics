import "server-only";
import type { Platform } from "@/core/domain";
import { createAdminClient } from "@/core/supabase/admin";
import { supabaseError } from "@/core/supabase/errors";
import {
  accountLabel,
  listConnectedAccounts,
  type ConnectedAccount,
} from "@/modules/accounts/tokens";

/**
 * Salud de la ingesta: cuándo fue la última captura, POR CUENTA. El cron es
 * diario, así que más de `STALE_AFTER_HOURS` sin captura indica que algo falló
 * (token muerto, cron caído, error de API).
 *
 * Por cuenta y no por plataforma: medir "la captura más reciente de la
 * plataforma" escondería que la principal dejó de capturar mientras una
 * secundaria sí lo hace — el watchdog diría "todo bien" justo cuando no.
 */

export const STALE_AFTER_HOURS = 36;

export interface CaptureStatus {
  lastCaptureAt: Date | null;
  /** true si nunca ha capturado o la última captura excede el umbral. */
  stale: boolean;
}

export interface AccountCaptureStatus extends CaptureStatus {
  account: ConnectedAccount;
  /** @handle o external id, para mostrar. */
  label: string;
}

async function lastCaptureOf(
  supabase: ReturnType<typeof createAdminClient>,
  accountId: string,
): Promise<CaptureStatus> {
  const { data, error } = await supabase
    .from("ra_account_snapshots")
    .select("captured_at")
    .eq("account_id", accountId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw supabaseError("ra_account_snapshots", error);
  if (!data) return { lastCaptureAt: null, stale: true };

  const lastCaptureAt = new Date(data.captured_at);
  const stale =
    Date.now() - lastCaptureAt.getTime() > STALE_AFTER_HOURS * 3_600_000;
  return { lastCaptureAt, stale };
}

/**
 * Estado de captura de cada cuenta CON CONEXIÓN de la plataforma (principal
 * primero). Una cuenta sin conexión no puede capturarse, así que no cuenta
 * como "dejó de capturar".
 */
export async function getAccountCaptureStatuses(
  platform: Platform,
): Promise<AccountCaptureStatus[]> {
  const supabase = createAdminClient();
  const accounts = await listConnectedAccounts(platform);
  return Promise.all(
    accounts.map(async (account) => ({
      account,
      label: accountLabel(account),
      ...(await lastCaptureOf(supabase, account.accountId)),
    })),
  );
}
