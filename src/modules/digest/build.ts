import "server-only";
import type { Platform } from "@/core/domain";
import { formatCount } from "@/core/lib/format";
import { dayKey, weekday } from "@/core/lib/datetime";
import { escapeHtml } from "@/core/lib/telegram";
import { readGrowth } from "@/modules/analytics/history";
import {
  bestBucket,
  CREATOR_TIMEZONE,
  engagementRate,
  viewsByWeekday,
} from "@/modules/analytics/insights";
import { readOverviewSummary } from "@/modules/analytics/overview";
import { resolvePeriod } from "@/modules/analytics/period";
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

  // Duración por formato. Solo TikTok expone duración en la API, pero como los
  // videos se cross-postean (mismo contenido en ambas plataformas), es
  // representativo del formato. Conteo de la semana + vistas/engagement PROMEDIO
  // históricos (una semana suelta de ~14 videos partida en 3 buckets es ruido).
  const today = dayKey(new Date(now), CREATOR_TIMEZONE);
  const weekDays = new Set(resolvePeriod("week", anchor, today).dayKeys);
  const tkDurable = videos.filter(
    (r) => r.video.platform === "tiktok" && r.video.durationSeconds != null,
  );
  const durationBuckets = [
    { label: "&lt;1 min", lo: 0, hi: 60 },
    { label: "1–2 min", lo: 60, hi: 120 },
    { label: "2+ min", lo: 120, hi: Infinity },
  ];
  const durationLines = durationBuckets
    .map(({ label, lo, hi }) => {
      const rows = tkDurable.filter((r) => {
        const s = r.video.durationSeconds as number;
        return s >= lo && s < hi;
      });
      if (rows.length === 0) return null;
      const weekN = rows.filter((r) =>
        weekDays.has(dayKey(r.video.publishedAt, CREATOR_TIMEZONE)),
      ).length;
      const avgViews = Math.round(
        rows.reduce((s, r) => s + r.metrics.views, 0) / rows.length,
      );
      const eng =
        (rows.reduce((s, r) => s + engagementRate(r.metrics), 0) / rows.length) *
        100;
      return `• ${label}: ${weekN} esta sem · ${formatCount(avgViews)} vistas · ${eng.toFixed(1)}% eng`;
    })
    .filter((l): l is string => l !== null);
  if (durationLines.length > 0) {
    lines.push("", "🎞 <b>Duración</b> (esta semana · prom. histórico, TikTok)");
    lines.push(...durationLines);
  }

  // Mejor día histórico (por vistas promedio de lo publicado ese día). La hora
  // se omite a propósito: el timestamp es de publicación, no de visualización,
  // así que no dice cuándo la gente realmente vio el video.
  const bestDay = bestBucket(viewsByWeekday(videos));
  if (bestDay) {
    lines.push(`🗓 <b>Mejor día (histórico)</b>: ${capitalize(bestDay.label)}`);
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
