"use server";

import type { Platform } from "@/core/domain";
import { createServerSupabase } from "@/core/supabase/server";
import { captureInstagram, captureTikTok } from "@/modules/ingestion/capture";
import type { IngestResult } from "@/modules/ingestion/persist";

export type CaptureResult =
  | { ok: true; result: IngestResult }
  | { ok: false; message: string };

/** Éxito = al menos una plataforma guardó; `failures` lleva las que no. */
export type CaptureAllResult =
  | {
      ok: true;
      videos: number;
      snapshots: number;
      failures: { platform: Platform; message: string }[];
    }
  | { ok: false; message: string };

const reason = (err: unknown) =>
  err instanceof Error ? err.message : "error desconocido";

/** Dispara la ingesta de una plataforma y guarda un snapshot. */
export async function captureSnapshotAction(
  platform: Platform,
): Promise<CaptureResult> {
  // Solo un usuario autenticado puede disparar capturas (evita POST directo).
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "No autorizado." };

  try {
    const result =
      platform === "tiktok" ? await captureTikTok() : await captureInstagram();
    return { ok: true, result };
  } catch (err) {
    return { ok: false, message: reason(err) };
  }
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
export async function captureAllAction(): Promise<CaptureAllResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "No autorizado." };

  const settled = await Promise.allSettled([
    captureTikTok(),
    captureInstagram(),
  ]);
  const platforms: Platform[] = ["tiktok", "instagram"];

  let videos = 0;
  let snapshots = 0;
  const failures: { platform: Platform; message: string }[] = [];

  settled.forEach((res, i) => {
    if (res.status === "fulfilled") {
      videos += res.value.videos;
      snapshots += res.value.snapshots;
    } else {
      failures.push({ platform: platforms[i], message: reason(res.reason) });
    }
  });

  if (failures.length === settled.length) {
    return { ok: false, message: failures.map((f) => f.message).join(" · ") };
  }
  return { ok: true, videos, snapshots, failures };
}
