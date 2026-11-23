import "server-only";
import { PLATFORMS, type Platform } from "@/core/domain";
import { formatCount } from "@/core/lib/format";
import { dayKey, weekday } from "@/core/lib/datetime";
import { escapeHtml } from "@/core/lib/telegram";
import { weekOverWeek } from "@/modules/analytics/account-week";
import {
  bestBucket,
  CREATOR_TIMEZONE,
  engagementRate,
  viewsByWeekday,
} from "@/modules/analytics/insights";
import { loadOverviewData, summarizeOverview } from "@/modules/analytics/overview";
import { resolvePeriod } from "@/modules/analytics/period";
import { getAccountCaptureStatuses } from "@/modules/ingestion/status";

/**
 * Arma el digest semanal en HTML de Telegram. Los totales son de TODAS las
 * cuentas (semana calendario recién terminada), igual que la vista por defecto
 * del panel. Después, una línea por cuenta contra SU propia semana anterior.
 * Duración y mejor día salen de las cuentas principales (son señales de la
 * estrategia de formato del canal principal). El watchdog de ingesta va al
 * final. Solo lee y formatea.
 *
 * Presupuesto: el cron tiene 60 s y corre justo después de que la ingesta
 * expiró el caché, así que todo se lee en frío. Por eso la historia de cada
 * cuenta se lee UNA vez (`loadOverviewData`, cuentas en paralelo) y las dos
 * semanas se miden sobre esos datos en memoria. Volver a leer por cuenta, en
 * serie, es lo que tumbó el digest del 23 nov 2026 con cinco cuentas.
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
  // cerrada.
  const anchor = dayKey(new Date(now - 86_400_000), CREATOR_TIMEZONE);
  const data = await loadOverviewData({ account: "all" });
  const summary = summarizeOverview(data, "week", anchor);
  const previous = summarizeOverview(data, "week", summary.period.prevAnchor);
  // Catálogo de las cuentas principales (duración y mejor día histórico).
  const videos = data.filter((d) => d.account.isPrimary).flatMap((d) => d.videos);
  const multiAccount = data.length > 1;

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
    `<i>${multiAccount ? `Todas las cuentas · ${period.label}` : period.label}</i>`,
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
    // Con varias cuentas, de cuál es el hit importa tanto como el hit.
    const owner =
      multiAccount && bestVideo.account ? ` · @${escapeHtml(bestVideo.account)}` : "";
    lines.push(
      `🏆 <b>Mejor video</b>: “${cap}” · ${PLATFORM_LABEL[bestVideo.platform]}${owner} · ${formatCount(bestVideo.views)} vistas`,
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

  // Secciones de la semana: antes solo salía la top; el desglose completo
  // permite seguir una sección NUEVA desde su primera semana sin esperar a que
  // gane. Ordenado por vistas, tope 6 líneas para no inflar el mensaje.
  const sections = [...contentTypes]
    .filter((t) => t.count > 0)
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 6);
  if (sections.length > 0) {
    lines.push("🏷 <b>Secciones de la semana</b>");
    for (const t of sections) {
      lines.push(
        `• ${escapeHtml(t.label)}: ${t.count} video${t.count !== 1 ? "s" : ""} · ${formatCount(t.totalViews)} vistas`,
      );
    }
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
    lines.push(
      "",
      `🎞 <b>Duración</b> (esta semana · prom. histórico, TikTok${multiAccount ? " principal" : ""})`,
    );
    lines.push(...durationLines);
  }

  // Mejor día histórico (por vistas promedio de lo publicado ese día). La hora
  // se omite a propósito: el timestamp es de publicación, no de visualización,
  // así que no dice cuándo la gente realmente vio el video.
  const bestDay = bestBucket(viewsByWeekday(videos));
  if (bestDay) {
    lines.push(
      `🗓 <b>Mejor día (histórico${multiAccount ? ", cuentas principales" : ""})</b>: ${capitalize(bestDay.label)}`,
    );
  }

  // Por cuenta: cada una contra SU propia semana anterior. Compararlas entre
  // sí no dice nada con nichos distintos (LoL, edits, Valorant) ni con
  // audiencias de tamaños tan dispares; contra su propia historia, sí. Una
  // línea por cuenta: con cinco cuentas, más sería ruido en el teléfono.
  if (multiAccount) {
    const prevById = new Map(previous.byAccount.map((a) => [a.accountId, a]));
    // Una cuenta sin videos ni buckets nunca se capturó (recién conectada).
    const captured = new Set(
      data
        .filter((d) => d.videos.length > 0 || d.daily.length > 0)
        .map((d) => d.account.accountId),
    );
    lines.push("", "👤 <b>Por cuenta</b> (vs su semana anterior)");
    for (const row of summary.byAccount) {
      const name = `<b>${escapeHtml(row.handle ? `@${row.handle}` : "cuenta nueva")}</b> · ${PLATFORM_LABEL[row.platform]}`;
      if (!captured.has(row.accountId)) {
        lines.push(`${name} — aún sin capturas`);
        continue;
      }
      const change = weekOverWeek(
        row.metrics.views,
        prevById.get(row.accountId)?.metrics.views ?? 0,
      );
      const pct =
        change === null ? "" : ` (${change >= 0 ? "+" : ""}${Math.round(change * 100)}%)`;
      const followers =
        row.followersGained === null ? "—" : signed(row.followersGained);
      lines.push(
        `${name} — ${formatCount(row.metrics.views)} vistas${pct} · ${followers} seg. · ${row.metrics.videosPublished} publ.`,
      );
    }
  }

  // Salud de la ingesta (watchdog), POR CUENTA: medida por plataforma, una
  // secundaria que sí captura taparía que la principal dejó de hacerlo.
  const statuses = (
    await Promise.all(PLATFORMS.map((p) => getAccountCaptureStatuses(p)))
  ).flat();
  for (const status of statuses) {
    if (!status.stale) continue;
    const since = status.lastCaptureAt
      ? `desde hace ${Math.round((now - status.lastCaptureAt.getTime()) / 86_400_000)} días`
      : "nunca ha capturado";
    lines.push(
      `⚠️ <b>Ingesta ${PLATFORM_LABEL[status.account.platform]} ${escapeHtml(status.label)}</b>: sin capturar ${since} — revisa Conexiones`,
    );
  }

  return lines.join("\n");
}
