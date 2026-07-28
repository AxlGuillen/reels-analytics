import { env } from "@/core/config/env";
import { runChecks } from "@/modules/health/checks";
import { rollupStatus } from "@/modules/health/status";
import { safeEqual } from "@/modules/oauth/tokens";

export const runtime = "nodejs";
// Un health cacheado miente: siempre se recalcula.
export const dynamic = "force-dynamic";

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

/**
 * Salud de la app para un monitor externo.
 *
 * Sin credencial devuelve solo `{status, checkedAt}` — suficiente para un uptime
 * monitor y sin filtrar estado interno (el repo es público). Con
 * `Authorization: Bearer $HEALTH_SECRET` añade el desglose por check.
 *
 * Código HTTP: 503 **solo** si algo está roto (`down`). Los avisos (ingesta
 * atrasada, token por vencer) responden 200 con `status: "degraded"`, para no
 * convertir el monitoreo en ruido.
 *
 * El secreto es propio y NO se reusa `CRON_SECRET`: esta URL se le entrega a un
 * servicio externo, y con el del cron podría disparar la ingesta.
 */
export async function GET(request: Request) {
  const startedAt = Date.now();
  const checks = await runChecks();
  const status = rollupStatus(checks);

  const secret = env("HEALTH_SECRET");
  const provided = request.headers.get("authorization") ?? "";
  // Un secreto incorrecto no es un fallo de salud: se responde como público.
  const detailed =
    !!secret && safeEqual(provided, `Bearer ${secret}`);

  const body = {
    status,
    checkedAt: new Date().toISOString(),
    ...(detailed
      ? {
          durationMs: Date.now() - startedAt,
          version: env("VERCEL_GIT_COMMIT_SHA")?.slice(0, 7) ?? "local",
          checks,
        }
      : {}),
  };

  return new Response(JSON.stringify(body), {
    status: status === "down" ? 503 : 200,
    headers: HEADERS,
  });
}
