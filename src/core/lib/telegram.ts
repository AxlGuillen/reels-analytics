import "server-only";
import { env } from "@/core/config/env";

/**
 * Cliente mínimo del Bot API de Telegram para notificaciones salientes.
 * Infraestructura compartida (sin lógica de dominio): el contenido lo arma
 * quien llama. Usa parse_mode HTML (escapar &, <, > en texto dinámico).
 */

/** Escapa texto dinámico para parse_mode HTML. */
export function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function telegramConfigured(): boolean {
  return !!env("TELEGRAM_BOT_TOKEN") && !!env("TELEGRAM_CHAT_ID");
}

/** Envía un mensaje HTML al chat configurado. Lanza si Telegram responde error. */
export async function sendTelegramMessage(html: string): Promise<void> {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_CHAT_ID");
  if (!token || !chatId) {
    throw new Error("Faltan TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID");
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
    cache: "no-store",
  });
  const json = (await res.json()) as { ok: boolean; description?: string };
  if (!res.ok || !json.ok) {
    throw new Error(`Telegram: ${json.description ?? res.status}`);
  }
}
