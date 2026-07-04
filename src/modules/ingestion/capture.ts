import "server-only";
import {
  getValidInstagramAccessToken,
  getValidTikTokAccessToken,
} from "@/modules/accounts/tokens";
import { readInstagramOverviewByToken } from "@/modules/instagram/read";
import { readTikTokOverviewByToken } from "@/modules/tiktok/read";
import { persistOverview, type IngestResult } from "./persist";

/**
 * Captura un snapshot de una plataforma: resuelve un token válido desde
 * `ra_connections` (con refresh), lee el overview completo y lo persiste.
 * Al no depender de la cookie, funciona igual desde el botón o desde el cron.
 */

export async function captureTikTok(): Promise<IngestResult> {
  const token = await getValidTikTokAccessToken();
  if (!token) {
    throw new Error(
      "TikTok sin conexión persistida. Reconéctate una vez para guardarla.",
    );
  }
  const overview = await readTikTokOverviewByToken(token);
  return persistOverview(overview.account, overview.videos);
}

export async function captureInstagram(): Promise<IngestResult> {
  const token = await getValidInstagramAccessToken();
  if (!token) {
    throw new Error("Instagram sin token válido (revisa INSTAGRAM_ACCESS_TOKEN).");
  }
  const overview = await readInstagramOverviewByToken(token);
  return persistOverview(overview.account, overview.videos);
}
