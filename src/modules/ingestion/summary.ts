import type { Platform } from "@/core/domain";

/**
 * Resultado de una captura, ya POR CUENTA. Puro (sin BD ni red): lo comparten
 * el cron, las acciones de captura y sus tests.
 *
 * Por qué por cuenta y no por plataforma: con varias cuentas de TikTok, que
 * falle una secundaria no debe ocultar que la principal guardó, ni al revés. Un
 * resumen por plataforma ("tiktok: ok") escondía justo eso.
 */

/** Resultado de capturar UNA cuenta. */
export interface AccountCapture {
  platform: Platform;
  /** @handle si ya lo conocemos; si no, el external id. */
  label: string;
  primary: boolean;
  ok: boolean;
  videos: number;
  snapshots: number;
  error?: string;
}

export interface CaptureFailure {
  platform: Platform;
  /** cuenta (@handle) o, si falló antes de saber cuál, la plataforma. */
  label: string;
  message: string;
}

export interface CaptureSummary {
  accounts: AccountCapture[];
  videos: number;
  snapshots: number;
  failures: CaptureFailure[];
  /** true si al menos UNA cuenta guardó: entonces cambió la analítica. */
  anySaved: boolean;
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
};

const reason = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

/**
 * Une las capturas de varias plataformas (cada una con N cuentas). Un rechazo
 * a nivel plataforma — sin conexión guardada, token ausente — no trae cuentas,
 * así que se reporta como un fallo etiquetado con la plataforma.
 */
export function summarizeCaptures(
  settled: { platform: Platform; result: PromiseSettledResult<AccountCapture[]> }[],
): CaptureSummary {
  const accounts: AccountCapture[] = [];
  const failures: CaptureFailure[] = [];

  for (const { platform, result } of settled) {
    if (result.status === "rejected") {
      failures.push({
        platform,
        label: PLATFORM_LABEL[platform],
        message: reason(result.reason),
      });
      continue;
    }
    for (const account of result.value) {
      accounts.push(account);
      if (!account.ok) {
        failures.push({
          platform,
          label: account.label,
          message: account.error ?? "error desconocido",
        });
      }
    }
  }

  const saved = accounts.filter((a) => a.ok);
  return {
    accounts,
    videos: saved.reduce((n, a) => n + a.videos, 0),
    snapshots: saved.reduce((n, a) => n + a.snapshots, 0),
    failures,
    anySaved: saved.length > 0,
  };
}
