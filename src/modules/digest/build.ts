import "server-only";
import type { Platform } from "@/core/domain";
import { formatCount } from "@/core/lib/format";
import { dayKey, weekday } from "@/core/lib/datetime";
import { escapeHtml } from "@/core/lib/telegram";
import { readBreakoutIds } from "@/modules/analytics/breakouts";
import { readGrowth } from "@/modules/analytics/history";
import {
  bestBucket,
  CREATOR_TIMEZONE,
  viewsByHour,
  viewsByWeekday,
} from "@/modules/analytics/insights";
import { readOverviewSummary } from "@/modules/analytics/overview";
import { getCaptureStatus } from "@/modules/ingestion/status";

/**
 * Arma el digest semanal en HTML de Telegram. El grueso sale de
 * `readOverviewSummary` (semana calendario recién terminada); breakouts, mejor
 * franja y el watchdog de ingesta se leen aparte. Solo lee y formatea.
 */

const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
};

function truncate(text: string, max = 48): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const signed = (value: number): string =>
  `${value >= 0 ? "+" : ""}${formatCount(value)}`;

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Etiqueta de día a partir de su clave `YYYY-MM-DD` (p. ej. "Jueves 17").
 * PRECONDICIÓN: la clave es de un sub-bucket DIARIO. El digest siempre usa
 * `granularity: "week"` (sub = day), así que se cumple; no reusar con periodo
 * mensual (sub = week, clave = lunes) sin ajustar el formato.
 */
function dayLabel(key: string): string {
  const name = weekday(new Date(`${key}T12:00:00Z`), "UTC");
  return `${capitalize(name)} ${Number(key.slice(8, 10))}`;
}

/**
 * Sección de una métrica con total + split por plataforma y su porcentaje.
 * `signedFmt` para deltas (seguidores) que muestran signo.
 */
function splitSection(
  emoji: string,
  title: string,
  tiktok: number,
  instagram: number,
  signedFmt = false,
): string[] {
  const fmt = signedFmt ? signed : formatCount;
  const total = tiktok + instagram;
  // El % solo tiene sentido si ambos sumandos son ≥0 (comparten signo con el
  // total). Los seguidores ganados pueden ser negativos por plataforma → ahí se
  // omite, que si no daría cosas como "TikTok +100 (167%) · Instagram -40 (-67%)".
  const showPct = total > 0 && tiktok >= 0 && instagram >= 0;
  const pct = (n: number) =>
    showPct ? ` (${Math.round((n / total) * 100)}%)` : "";
  return [
    `${emoji} <b>${title}</b>`,
    `• Total: ${fmt(total)}`,
    `• TikTok: ${fmt(tiktok)}${pct(tiktok)}`,
    `• Instagram: ${fmt(instagram)}${pct(instagram)}`,
    "",
  ];
}

export async function buildWeeklyDigest(): Promise<string> {
  const now = Date.now();
  // Ancla en "ayer": corriendo el lunes, cae en domingo → semana Lun–Dom recién
  // cerrada. La lectura pesada (ambas plataformas) vive en readOverviewSummary.
  const anchor = dayKey(new Date(now - 86_400_000), CREATOR_TIMEZONE);
  const [summary, { videos }] = await Promise.all([
    readOverviewSummary({ granularity: "week", anchor }),
    readGrowth(),
  ]);

  const {
    combined,
    byPlatform,
    followersByPlatform,
    subBuckets,
    contentTypes,
    bestVideo,
    period,
  } = summary;

  const lines: string[] = [
    "<b>📊 Reels Analytics — resumen semanal</b>",
    `<i>${period.label}</i>`,
    "",
  ];

  // Vistas, seguidores y comentarios: total + split + %.
  lines.push(
    ...splitSection(
      "👁",
      "Vistas ganadas",
      byPlatform.tiktok.views,
      byPlatform.instagram.views,
    ),
  );
  lines.push(
    ...splitSection(
      "👥",
      "Seguidores ganados",
      followersByPlatform.tiktok ?? 0,
      followersByPlatform.instagram ?? 0,
      true,
    ),
  );
  lines.push(
    ...splitSection(
      "💬",
      "Comentarios",
      byPlatform.tiktok.comments,
      byPlatform.instagram.comments,
    ),
  );

  // Publicados: total + split (sin %, suelen ir parejos entre plataformas).
  lines.push(
    `🎬 <b>Publicados</b>: ${combined.videosPublished} ` +
      `(${byPlatform.tiktok.videosPublished} TikTok · ${byPlatform.instagram.videosPublished} Instagram)`,
  );

  // Mejor video de la semana.
  if (bestVideo) {
    const cap = escapeHtml(
      truncate(bestVideo.caption?.trim() || bestVideo.externalId),
    );
    lines.push(
      `🏆 <b>Mejor video</b>: “${cap}” · ${PLATFORM_LABEL[bestVideo.platform]} · ${formatCount(bestVideo.views)} vistas`,
    );
  }
  lines.push("");

  // Días ordenados de más a menos vistas.
  const rankedDays = [...subBuckets].sort(
    (a, b) => b.combined.views - a.combined.views,
  );
  if (rankedDays.some((d) => d.combined.views > 0)) {
    lines.push("📅 <b>Días (más → menos vistas)</b>");
    rankedDays.forEach((d, i) => {
      lines.push(`${i + 1}. ${dayLabel(d.key)} — ${formatCount(d.combined.views)}`);
    });
    lines.push("");
  }

  // Sección (tipo de contenido) con más vistas en la semana.
  const topType = [...contentTypes].sort((a, b) => b.totalViews - a.totalViews)[0];
  if (topType && topType.totalViews > 0) {
    lines.push(
      `🏷 <b>Sección top</b>: ${escapeHtml(topType.label)} — ${formatCount(topType.totalViews)} vistas (${topType.count} video${topType.count !== 1 ? "s" : ""})`,
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
    const cap = escapeHtml(
      truncate(row.video.caption?.trim() || row.video.externalId),
    );
    lines.push(
      `🔥 <b>Breakout</b> (${PLATFORM_LABEL[row.video.platform]}): “${cap}”`,
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
