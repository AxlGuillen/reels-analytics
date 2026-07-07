import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/core/config/env";
import { sendTelegramMessage, telegramConfigured } from "@/core/lib/telegram";
import { buildWeeklyDigest } from "@/modules/digest/build";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron semanal (lunes): arma el digest y lo manda por Telegram. Corre separado
 * del cron de ingesta a propósito: así también funciona de watchdog — si la
 * ingesta lleva días muerta, este mensaje es el que te avisa.
 * Protegido por `CRON_SECRET`, igual que /api/cron/ingest.
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
  if (!telegramConfigured()) {
    return NextResponse.json(
      { error: "Faltan TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID" },
      { status: 500 },
    );
  }

  try {
    const message = await buildWeeklyDigest();
    await sendTelegramMessage(message);
    return NextResponse.json({ sent: true, sentAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { sent: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
