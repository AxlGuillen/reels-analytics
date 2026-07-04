"use server";

import type { Platform } from "@/core/domain";
import { captureInstagram, captureTikTok } from "@/modules/ingestion/capture";
import type { IngestResult } from "@/modules/ingestion/persist";

export type CaptureResult =
  | { ok: true; result: IngestResult }
  | { ok: false; message: string };

/** Dispara la ingesta de una plataforma y guarda un snapshot. */
export async function captureSnapshotAction(
  platform: Platform,
): Promise<CaptureResult> {
  try {
    const result =
      platform === "tiktok" ? await captureTikTok() : await captureInstagram();
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "error desconocido",
    };
  }
}
