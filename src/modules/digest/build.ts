import "server-only";
import type { Platform } from "@/core/domain";
import { formatCount } from "@/core/lib/format";
import { escapeHtml } from "@/core/lib/telegram";
import { readBreakoutIds } from "@/modules/analytics/breakouts";
import {
  readGrowth,
  readSnapshotSeries,
  type AccountSeries,
} from "@/modules/analytics/history";
import {
  bestBucket,
  viewsByHour,
  viewsByWeekday,
  type VideoWithMetrics,
} from "@/modules/analytics/insights";
import { getCaptureStatus } from "@/modules/ingestion/status";

/**
 * Arma el digest semanal en HTML de Telegram a partir de la historia persistida.
 * Solo lee y empaqueta (nada nuevo se calcula aquí que no exista en analytics);
 * cada sección degrada a "—" u omite si aún no hay datos.
 */

const WEEK_MS = 7 * 86_400_000;
const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
};

function truncate(text: string, max = 48): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Delta de seguidores de los últimos `days` días (última vs. pasada). */
function followerDelta(series: AccountSeries, days: number): number | null {
  const points = series.points.filter((p) => p.followers !== null);
  if (points.length < 2) return null;
  const latest = points[points.length - 1];
  const cutoff = new Date(latest.capturedAt).getTime() - days * 86_400_000;
  const past = [...points]
    .reverse()
    .find((p) => new Date(p.capturedAt).getTime() <= cutoff);
  if (!past) return null;
  return (latest.followers ?? 0) - (past.followers ?? 0);
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${formatCount(value)}`;
}

/** Vistas ganadas por el catálogo en los últimos 7 días (deltas de snapshots). */
function weeklyGained(seriesList: { capturedAt: Date; views: number }[][]): number {
  const cutoff = Date.now() - WEEK_MS;
  let gained = 0;
  for (const series of seriesList) {
    const sorted = [...series].sort(
      (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
    );
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].capturedAt.getTime() >= cutoff) {
        gained += sorted[i].views - sorted[i - 1].views;
      }
    }
  }
  return gained;
}

function caption(row: VideoWithMetrics): string {
  return escapeHtml(truncate(row.video.caption?.trim() || row.video.externalId));
}

export async function buildWeeklyDigest(): Promise<string> {
  const now = Date.now();
  const [{ videos, accountSeries }, snapshotSeries] = await Promise.all([
    readGrowth(),
    readSnapshotSeries(),
  ]);

  const lines: string[] = ["<b>📊 Reels Analytics — resumen semanal</b>", ""];

  // Seguidores por plataforma (+7d).
  const followerParts = accountSeries
    .map((s) => {
      const current = s.points.filter((p) => p.followers !== null).at(-1)?.followers;
      if (current == null) return null;
      const delta = followerDelta(s, 7);
      const deltaText = delta === null ? "" : ` (${signed(delta)} 7d)`;
      return `${PLATFORM_LABEL[s.platform]} ${formatCount(current)}${deltaText}`;
    })
    .filter((p): p is string => p !== null);
  if (followerParts.length > 0) {
    lines.push(`👥 <b>Seguidores</b>: ${followerParts.join(" · ")}`);
  }

  // Momentum semanal del catálogo.
  const gained = weeklyGained(snapshotSeries);
  if (gained !== 0) {
    lines.push(`▶️ <b>Vistas ganadas (7d)</b>: ${signed(gained)}`);
  }

  // Publicados en la semana + mejor estreno.
  const recent = videos.filter(
    (r) => now - r.video.publishedAt.getTime() <= WEEK_MS,
  );
  if (recent.length > 0) {
    const byPlatform = new Map<Platform, number>();
    for (const r of recent) {
      byPlatform.set(r.video.platform, (byPlatform.get(r.video.platform) ?? 0) + 1);
    }
    const parts = [...byPlatform.entries()]
      .map(([p, n]) => `${n} ${PLATFORM_LABEL[p]}`)
      .join(", ");
    lines.push(`🎬 <b>Publicados (7d)</b>: ${recent.length} (${parts})`);

    const best = recent.reduce((a, b) => (b.metrics.views > a.metrics.views ? b : a));
    lines.push(
      `🏆 <b>Mejor estreno</b>: “${caption(best)}” — ${formatCount(best.metrics.views)} vistas`,
    );
  }

  // Breakouts vigentes (≥2× la mediana de su plataforma a su edad).
  const [ttBreakouts, igBreakouts] = await Promise.all([
    readBreakoutIds("tiktok").catch(() => new Set<string>()),
    readBreakoutIds("instagram").catch(() => new Set<string>()),
  ]);
  const breakoutRows = videos
    .filter(
      (r) =>
        (r.video.platform === "tiktok" && ttBreakouts.has(r.video.externalId)) ||
        (r.video.platform === "instagram" && igBreakouts.has(r.video.externalId)),
    )
    .sort((a, b) => b.metrics.views - a.metrics.views)
    .slice(0, 2);
  for (const row of breakoutRows) {
    lines.push(
      `🔥 <b>Breakout</b> (${PLATFORM_LABEL[row.video.platform]}): “${caption(row)}”`,
    );
  }

  // Recordatorio de la mejor franja (sobre todo el catálogo).
  const bestDay = bestBucket(viewsByWeekday(videos));
  const bestHour = bestBucket(viewsByHour(videos));
  if (bestDay && bestHour) {
    lines.push(`🗓 <b>Mejor franja</b>: ${bestDay.label} ~${bestHour.label}`);
  }

  // Salud de la ingesta (watchdog): avisar si alguna plataforma dejó de capturar.
  const [ttCapture, igCapture] = await Promise.all([
    getCaptureStatus("tiktok"),
    getCaptureStatus("instagram"),
  ]);
  for (const [platform, status] of [
    ["tiktok", ttCapture],
    ["instagram", igCapture],
  ] as const) {
    if (status.stale) {
      const since = status.lastCaptureAt
        ? `desde hace ${Math.round((now - status.lastCaptureAt.getTime()) / 86_400_000)} días`
        : "nunca ha capturado";
      lines.push(
        `⚠️ <b>Ingesta ${PLATFORM_LABEL[platform]}</b>: sin capturar ${since} — revisa Conexiones`,
      );
    }
  }

  return lines.join("\n");
}
