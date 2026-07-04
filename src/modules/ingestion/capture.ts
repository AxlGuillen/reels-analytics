import "server-only";
import { readInstagramOverview } from "@/modules/instagram/read";
import { readTikTokOverview } from "@/modules/tiktok/read";
import { getSession } from "@/modules/tiktok/session";
import { persistOverview, type IngestResult } from "./persist";

/**
 * Captura un snapshot de una plataforma: lee el overview completo de la API y
 * lo persiste. Sin rango → trae todo lo disponible (histórico base). Más
 * adelante esto lo dispara un cron; por ahora lo dispara el botón del dashboard.
 */

export async function captureTikTok(): Promise<IngestResult> {
  const session = await getSession();
  const result = await readTikTokOverview(session);
  if (result.status !== "ok") {
    throw new Error(`TikTok no disponible (${result.status})`);
  }
  return persistOverview(result.overview.account, result.overview.videos);
}

export async function captureInstagram(): Promise<IngestResult> {
  const result = await readInstagramOverview();
  if (result.status !== "ok") {
    throw new Error(`Instagram no disponible (${result.status})`);
  }
  return persistOverview(result.overview.account, result.overview.videos);
}
