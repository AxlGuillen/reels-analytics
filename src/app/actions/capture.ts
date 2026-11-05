"use server";

import { updateTag } from "next/cache";
import type { Platform } from "@/core/domain";
import { ANALYTICS_TAG } from "@/core/lib/cache-tags";
import { createServerSupabase } from "@/core/supabase/server";
import { captureInstagram, captureTikTok } from "@/modules/ingestion/capture";
import {
  summarizeCaptures,
  type CaptureFailure,
} from "@/modules/ingestion/summary";

/**
 * Éxito = al menos UNA cuenta guardó; `failures` lleva las que no (por cuenta,
 * o por plataforma si falló antes de saber cuál). Es la misma forma para el
 * botón por plataforma y para "Capturar ahora".
 */
export type CaptureResult =
  | { ok: true; videos: number; snapshots: number; failures: CaptureFailure[] }
  | { ok: false; message: string };

const CAPTURE = { tiktok: captureTikTok, instagram: captureInstagram } as const;

async function isAuthed(): Promise<boolean> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

/** Corre la captura de las plataformas dadas y la resume por cuenta. */
async function runCaptures(platforms: Platform[]): Promise<CaptureResult> {
  const settled = await Promise.allSettled(platforms.map((p) => CAPTURE[p]()));
  const summary = summarizeCaptures(
    settled.map((result, i) => ({ platform: platforms[i], result })),
  );
  if (!summary.anySaved) {
    return {
      ok: false,
      message:
        summary.failures.map((f) => `${f.label}: ${f.message}`).join(" · ") ||
        "Nada que capturar.",
    };
  }
  // Read-your-own-writes: el `router.refresh()` posterior debe ver lo capturado.
  updateTag(ANALYTICS_TAG);
  return {
    ok: true,
    videos: summary.videos,
    snapshots: summary.snapshots,
    failures: summary.failures,
  };
}

/**
 * Dispara la ingesta de una plataforma (TODAS sus cuentas con conexión) y
 * guarda un snapshot de cada una.
 */
export async function captureSnapshotAction(
  platform: Platform,
): Promise<CaptureResult> {
  // Solo un usuario autenticado puede disparar capturas (evita POST directo).
  if (!(await isAuthed())) return { ok: false, message: "No autorizado." };
  return runCaptures([platform]);
}

/**
 * Captura de AMBAS plataformas a demanda — lo que dispara el botón del rail /
 * topbar para no esperar al cron de las 08:00.
 *
 * En paralelo y con `allSettled` como el cron (`api/cron/ingest`): si una
 * plataforma falla (token vencido, rate limit de IG) la otra igual guarda, y el
 * paralelo mantiene el tiempo de pared cerca del de una sola captura — importa
 * porque un server action muere con el `maxDuration` de la ruta que lo invoca.
 *
 * Capturar de más es seguro para la analítica: los deltas de video se atribuyen
 * a la ventana donde INICIAN (`timeline.ts`), así que una captura extra parte la
 * ventana del día sin duplicar nada, y los deltas de seguidores se quedan con la
 * última lectura de cada día (`attribution.ts`). Los snapshots son inserts
 * inmutables: no hay constraint por día que romper.
 */
export async function captureAllAction(): Promise<CaptureResult> {
  if (!(await isAuthed())) return { ok: false, message: "No autorizado." };
  return runCaptures(["tiktok", "instagram"]);
}
