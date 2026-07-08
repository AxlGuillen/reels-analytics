import "server-only";
import type { Platform } from "@/core/domain";
import { createAdminClient } from "@/core/supabase/admin";

/**
 * Salud de la ingesta: cuándo fue la última captura por plataforma. El cron es
 * diario, así que más de `STALE_AFTER_HOURS` sin captura indica que algo falló
 * (token muerto, cron caído, error de API).
 */

export const STALE_AFTER_HOURS = 36;

export interface CaptureStatus {
  lastCaptureAt: Date | null;
  /** true si nunca ha capturado o la última captura excede el umbral. */
  stale: boolean;
}

export async function getCaptureStatus(platform: Platform): Promise<CaptureStatus> {
  const supabase = createAdminClient();

  const { data: accounts } = await supabase
    .from("ra_social_accounts")
    .select("id")
    .eq("platform", platform);
  const ids = (accounts ?? []).map((a) => a.id);
  if (ids.length === 0) return { lastCaptureAt: null, stale: true };

  const { data } = await supabase
    .from("ra_account_snapshots")
    .select("captured_at")
    .in("account_id", ids)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { lastCaptureAt: null, stale: true };

  const lastCaptureAt = new Date(data.captured_at);
  const stale =
    Date.now() - lastCaptureAt.getTime() > STALE_AFTER_HOURS * 3_600_000;
  return { lastCaptureAt, stale };
}
