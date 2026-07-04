import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/core/config/env";
import { captureInstagram, captureTikTok } from "@/modules/ingestion/capture";

export const runtime = "nodejs";
// La ingesta de IG hace 1 llamada de insights por Reel; damos margen de tiempo.
export const maxDuration = 60;

/**
 * Cron de ingesta: captura un snapshot de cada plataforma.
 *
 * Protegido por `CRON_SECRET`: Vercel envía `Authorization: Bearer $CRON_SECRET`
 * al invocar el cron. Fail-closed: si no hay secreto configurado, no corre.
 * Cada plataforma se captura de forma independiente (si una falla, la otra sigue).
 */
export async function GET(request: NextRequest) {
  const secret = env("CRON_SECRET");
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado" },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [tiktok, instagram] = await Promise.allSettled([
    captureTikTok(),
    captureInstagram(),
  ]);

  const summarize = (r: PromiseSettledResult<{ videos: number; snapshots: number }>) =>
    r.status === "fulfilled"
      ? { ok: true, ...r.value }
      : {
          ok: false,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        };

  return NextResponse.json({
    capturedAt: new Date().toISOString(),
    tiktok: summarize(tiktok),
    instagram: summarize(instagram),
  });
}
