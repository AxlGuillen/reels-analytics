import "server-only";
import type { Platform } from "@/core/domain";
import {
  classifyContentType,
  contentTypeLabel,
  type ContentTypeKey,
} from "@/core/lib/content-type";
import { dayKey, monthKey } from "@/core/lib/datetime";
import { dailyFollowerDeltas } from "@/modules/analytics/attribution";
import {
  readBreakoutDetails,
  readVideoBenchmark,
} from "@/modules/analytics/breakouts";
import {
  readGrowth,
  readSnapshotSeries,
  readVideoHistory,
  type AccountSeries,
} from "@/modules/analytics/history";
import {
  bestBucket,
  CREATOR_TIMEZONE,
  engagementRate,
  gainedByMonth,
  summarize,
  viewsByHour,
  viewsByWeekday,
  type VideoWithMetrics,
} from "@/modules/analytics/insights";
import { buildTimeline, type Granularity } from "@/modules/analytics/timeline";
import {
  initialVelocity,
  toAgePoints,
  viewsAtAge,
} from "@/modules/analytics/timeseries";

/**
 * Lógica de las tools del servidor MCP (/api/mcp). Otro consumidor más de
 * `modules/analytics`: expone la historia persistida para que Claude cruce
 * guiones (vault de Obsidian) con rendimiento real. Solo lectura.
 */

function videoSummary(row: VideoWithMetrics) {
  const type = classifyContentType(row.video.hashtags);
  return {
    platform: row.video.platform,
    externalId: row.video.externalId,
    caption: row.video.caption,
    hashtags: row.video.hashtags,
    contentType: type,
    contentTypeLabel: contentTypeLabel(type),
    publishedAt: row.video.publishedAt.toISOString(),
    url: row.video.url,
    metrics: {
      views: row.metrics.views,
      likes: row.metrics.likes,
      comments: row.metrics.comments,
      shares: row.metrics.shares,
      saved: row.metrics.saved,
      engagementRate: Number(engagementRate(row.metrics).toFixed(4)),
      capturedAt: row.metrics.capturedAt.toISOString(),
    },
  };
}

/** Busca videos por texto del caption (case-insensitive). */
export async function searchVideos(params: {
  query: string;
  platform?: Platform;
  limit?: number;
}) {
  const { videos } = await readGrowth({ platform: params.platform });
  const needle = params.query.toLowerCase();
  const matches = videos
    .filter((r) => (r.video.caption ?? "").toLowerCase().includes(needle))
    .sort((a, b) => b.video.publishedAt.getTime() - a.video.publishedAt.getTime())
    .slice(0, params.limit ?? 10);
  return { total: matches.length, videos: matches.map(videoSummary) };
}

/** Métricas completas de un video: actuales + normalizadas por edad + benchmark. */
export async function getVideoStats(params: {
  platform: Platform;
  externalId: string;
  ageDays?: number;
}) {
  const ageDays = params.ageDays ?? 30;
  const { videos } = await readGrowth({ platform: params.platform });
  const row = videos.find((r) => r.video.externalId === params.externalId);
  if (!row) {
    return {
      error: `Video ${params.platform}/${params.externalId} no encontrado en la historia persistida.`,
    };
  }

  const [history, benchmark] = await Promise.all([
    readVideoHistory(params.platform, params.externalId),
    readVideoBenchmark(params.platform, params.externalId).catch(() => null),
  ]);
  const agePoints = toAgePoints(
    row.video.publishedAt,
    history.map((p) => ({ capturedAt: new Date(p.capturedAt), views: p.views })),
  );

  return {
    ...videoSummary(row),
    ageAnalysis: {
      requestedAgeDays: ageDays,
      viewsAtAge: viewsAtAge(agePoints, ageDays),
      initialVelocityPerDay: initialVelocity(agePoints),
      snapshotCount: history.length,
      note: "viewsAtAge es null si el video es más joven que ageDays o si no se capturó su ventana temprana.",
    },
    benchmark: benchmark
      ? {
          multiple: Number(benchmark.result.multiple.toFixed(2)),
          atAgeDays: benchmark.result.atAgeDays,
          medianViews: benchmark.result.medianViews,
          note: "múltiplo vs. la mediana de videos recientes de la plataforma a la misma edad.",
        }
      : null,
    history: history.map((p) => ({
      capturedAt: p.capturedAt,
      views: p.views,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      saved: p.saved,
    })),
  };
}

/** Ranking de videos, filtrable por tipo de contenido y ventana de publicación. */
export async function getTopVideos(params: {
  contentType?: ContentTypeKey;
  platform?: Platform;
  publishedWithinDays?: number;
  orderBy?: "views" | "engagement";
  limit?: number;
}) {
  const { videos } = await readGrowth({ platform: params.platform });
  const cutoff = params.publishedWithinDays
    ? Date.now() - params.publishedWithinDays * 86_400_000
    : null;

  const filtered = videos.filter((r) => {
    if (cutoff && r.video.publishedAt.getTime() < cutoff) return false;
    if (
      params.contentType &&
      classifyContentType(r.video.hashtags) !== params.contentType
    ) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) =>
    params.orderBy === "engagement"
      ? engagementRate(b.metrics) - engagementRate(a.metrics)
      : b.metrics.views - a.metrics.views,
  );

  return {
    total: filtered.length,
    videos: sorted.slice(0, params.limit ?? 10).map(videoSummary),
  };
}

/** Deltas diarios de seguidores de todas las cuentas del alcance, sumados. */
function mergedFollowerDeltas(accountSeries: AccountSeries[]) {
  const byDay = new Map<string, number>();
  for (const s of accountSeries) {
    const deltas = dailyFollowerDeltas(
      s.points.map((p) => ({
        capturedAt: new Date(p.capturedAt),
        followers: p.followers,
      })),
    );
    for (const d of deltas) byDay.set(d.day, (byDay.get(d.day) ?? 0) + d.delta);
  }
  return [...byDay.entries()].map(([day, delta]) => ({ day, delta }));
}

const TIMELINE_DEFAULT_DAYS: Record<Granularity, number> = {
  day: 30,
  week: 84,
  month: 365,
};

/**
 * Actividad por día/semana/mes: videos publicados, métricas GANADAS (deltas de
 * snapshots) y seguidores ganados. Solo cubre desde que arrancó la ingesta.
 */
export async function getActivityTimeline(params: {
  granularity?: Granularity;
  platform?: Platform;
  sinceDays?: number;
}) {
  const granularity = params.granularity ?? "day";
  const sinceDays = params.sinceDays ?? TIMELINE_DEFAULT_DAYS[granularity];

  const [{ videos, accountSeries }, snapshotSeries] = await Promise.all([
    readGrowth({ platform: params.platform }),
    readSnapshotSeries({ platform: params.platform }),
  ]);

  const timeline = buildTimeline(
    {
      publishedAt: videos.map((r) => r.video.publishedAt),
      snapshotSeries,
      followerDeltas: mergedFollowerDeltas(accountSeries),
    },
    granularity,
  );

  // Las claves (YYYY-MM-DD / YYYY-MM) son lexicográficamente ordenables. El
  // cutoff se llavea en la MISMA zona que los buckets (evita desfase de bordes).
  const cutoffDate = new Date(Date.now() - sinceDays * 86_400_000);
  const cutoffKey =
    granularity === "month"
      ? monthKey(cutoffDate, CREATOR_TIMEZONE)
      : dayKey(cutoffDate, CREATOR_TIMEZONE);
  const firstCapture = accountSeries
    .flatMap((s) => s.points.map((p) => p.capturedAt))
    .sort()[0];

  return {
    granularity,
    dataObservedSince: firstCapture ?? null,
    note: "Las métricas 'gained' salen de deltas entre snapshots diarios; no hay datos anteriores al inicio de la ingesta. followersGained null = sin observación ese periodo.",
    buckets: timeline.filter((b) => b.bucket >= cutoffKey),
  };
}

/** Rendimiento agregado de un hashtag arbitrario (no solo tipos de contenido). */
export async function getHashtagStats(params: {
  hashtag: string;
  platform?: Platform;
  publishedWithinDays?: number;
  topN?: number;
}) {
  const tag = params.hashtag.replace(/^#/, "").trim().toLowerCase();
  const { videos } = await readGrowth({ platform: params.platform });
  const cutoff = params.publishedWithinDays
    ? Date.now() - params.publishedWithinDays * 86_400_000
    : null;

  const tagged = videos.filter(
    (r) =>
      r.video.hashtags.includes(tag) &&
      (!cutoff || r.video.publishedAt.getTime() >= cutoff),
  );
  if (tagged.length === 0) {
    return { hashtag: tag, videoCount: 0, note: "Ningún video lleva ese hashtag en el alcance pedido." };
  }

  const s = summarize(tagged);
  const totals = tagged.reduce(
    (acc, r) => ({
      likes: acc.likes + r.metrics.likes,
      comments: acc.comments + r.metrics.comments,
      shares: acc.shares + r.metrics.shares,
      saved: acc.saved + (r.metrics.saved ?? 0),
    }),
    { likes: 0, comments: 0, shares: 0, saved: 0 },
  );
  const byPlatform = new Map<Platform, number>();
  for (const r of tagged) {
    byPlatform.set(r.video.platform, (byPlatform.get(r.video.platform) ?? 0) + 1);
  }

  return {
    hashtag: tag,
    videoCount: tagged.length,
    byPlatform: Object.fromEntries(byPlatform),
    totalViews: s.totalViews,
    avgViews: Math.round(s.avgViews),
    weightedEngagement: Number(s.weightedEngagement.toFixed(4)),
    totals,
    topVideos: [...tagged]
      .sort((a, b) => b.metrics.views - a.metrics.views)
      .slice(0, params.topN ?? 5)
      .map(videoSummary),
  };
}

/** TikTok vs Instagram lado a lado en la misma ventana de tiempo. */
export async function comparePlatforms(params: { sinceDays?: number } = {}) {
  const sinceDays = params.sinceDays ?? 30;
  const cutoff = Date.now() - sinceDays * 86_400_000;
  // Mismo día calendario que los deltas de seguidores (que usan CREATOR_TIMEZONE).
  const cutoffDay = dayKey(new Date(cutoff), CREATOR_TIMEZONE);

  const platforms: Platform[] = ["tiktok", "instagram"];
  const results = await Promise.all(
    platforms.map(async (platform) => {
      const [{ videos, accountSeries }, snapshotSeries] = await Promise.all([
        readGrowth({ platform }),
        readSnapshotSeries({ platform }),
      ]);

      const published = videos.filter(
        (r) => r.video.publishedAt.getTime() >= cutoff,
      );
      let viewsGained = 0;
      for (const series of snapshotSeries) {
        const sorted = [...series].sort(
          (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
        );
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].capturedAt.getTime() >= cutoff) {
            viewsGained += sorted[i].views - sorted[i - 1].views;
          }
        }
      }
      const followersGained = mergedFollowerDeltas(accountSeries)
        .filter((d) => d.day >= cutoffDay)
        .reduce((sum, d) => sum + d.delta, 0);
      const s = summarize(published);

      return {
        platform,
        followers:
          accountSeries[0]?.points.filter((p) => p.followers !== null).at(-1)
            ?.followers ?? null,
        followersGained,
        videosPublished: published.length,
        viewsGainedByCatalog: viewsGained,
        publishedInWindow: {
          totalViews: s.totalViews,
          avgViews: Math.round(s.avgViews),
          weightedEngagement: Number(s.weightedEngagement.toFixed(4)),
        },
      };
    }),
  );

  return {
    windowDays: sinceDays,
    note: "viewsGainedByCatalog = deltas de snapshots de TODO el catálogo en la ventana; publishedInWindow = solo lo publicado en la ventana (métricas acumuladas).",
    platforms: results,
  };
}

/** Videos que están despegando AHORA (≥2× la mediana de su plataforma a su edad). */
export async function getBreakouts(params: { platform?: Platform } = {}) {
  const platforms: Platform[] = params.platform
    ? [params.platform]
    : ["tiktok", "instagram"];

  const results = await Promise.all(
    platforms.map(async (platform) => {
      const [details, { videos }] = await Promise.all([
        readBreakoutDetails(platform).catch(() => []),
        readGrowth({ platform }),
      ]);
      const byId = new Map(videos.map((r) => [r.video.externalId, r]));
      return details.flatMap((d) => {
        const row = byId.get(d.externalId);
        return row
          ? [
              {
                ...videoSummary(row),
                breakout: {
                  multiple: Number(d.result.multiple.toFixed(2)),
                  atAgeDays: d.result.atAgeDays,
                  medianViews: d.result.medianViews,
                },
              },
            ]
          : [];
      });
    }),
  );

  const breakouts = results.flat();
  return {
    total: breakouts.length,
    note:
      breakouts.length === 0
        ? "Sin breakouts ahora: nada supera 2× la mediana a su edad, o el cohorte con historia temprana aún es chico (crece solo con los días)."
        : "multiple = cuántas veces la mediana de videos recientes de su plataforma lleva el video a su misma edad.",
    breakouts,
  };
}

function yamlNumber(value: number | null): string {
  return value === null ? "null" : String(value);
}

/** Sección YAML de una plataforma para el bloque de stats de un guion. */
async function scriptPlatformSection(
  row: VideoWithMetrics,
  ageDays: number,
): Promise<string> {
  const history = await readVideoHistory(
    row.video.platform,
    row.video.externalId,
  );
  const agePoints = toAgePoints(
    row.video.publishedAt,
    history.map((p) => ({ capturedAt: new Date(p.capturedAt), views: p.views })),
  );
  const m = row.metrics;
  return [
    `  ${row.video.platform}:`,
    `    id: "${row.video.externalId}"`,
    `    publicado: "${dayKey(row.video.publishedAt, CREATOR_TIMEZONE)}"`,
    `    vistas: ${m.views}`,
    `    likes: ${m.likes}`,
    `    comentarios: ${m.comments}`,
    `    compartidos: ${m.shares}`,
    `    guardados: ${yamlNumber(m.saved)}`,
    `    engagement: ${engagementRate(m).toFixed(4)}`,
    `    vistas_a_${ageDays}_dias: ${yamlNumber(viewsAtAge(agePoints, ageDays))}`,
    `    velocidad_inicial_dia: ${yamlNumber(initialVelocity(agePoints))}`,
    `    url: "${row.video.url ?? ""}"`,
  ].join("\n");
}

/**
 * Bloque YAML listo para pegar en el frontmatter de un guion (Obsidian).
 * Busca el video en AMBAS plataformas por el texto del caption (el "código"
 * del guion) y arma las stats con el corte por edad pedido.
 */
export async function getScriptStatsBlock(params: {
  query: string;
  ageDays?: number;
}): Promise<string> {
  const ageDays = params.ageDays ?? 30;
  const { videos } = await readGrowth();
  const needle = params.query.toLowerCase().trim();
  const matches = videos.filter((r) =>
    (r.video.caption ?? "").toLowerCase().includes(needle),
  );
  if (matches.length === 0) {
    return `No encontré ningún video cuyo caption contenga “${params.query}”. Prueba con el código exacto del guion (el texto antes de los hashtags).`;
  }

  const notes: string[] = [];
  const sections: string[] = [];
  let totalViews = 0;
  let totalInteractions = 0;

  for (const platform of ["tiktok", "instagram"] as const) {
    const candidates = matches
      .filter((r) => r.video.platform === platform)
      .sort(
        (a, b) => b.video.publishedAt.getTime() - a.video.publishedAt.getTime(),
      );
    const best = candidates[0];
    if (!best) {
      notes.push(`- ${platform}: sin coincidencias.`);
      continue;
    }
    if (candidates.length > 1) {
      notes.push(
        `- ${platform}: ${candidates.length} coincidencias; usé la más reciente (${dayKey(best.video.publishedAt)}). Afina el código si no es la correcta.`,
      );
    }
    sections.push(await scriptPlatformSection(best, ageDays));
    totalViews += best.metrics.views;
    totalInteractions +=
      best.metrics.likes + best.metrics.comments + best.metrics.shares;
  }

  const yaml = [
    "stats:",
    `  actualizado: "${dayKey(new Date(), CREATOR_TIMEZONE)}"`,
    `  corte_dias: ${ageDays}`,
    ...sections,
    "  total:",
    `    vistas: ${totalViews}`,
    `    engagement_ponderado: ${totalViews > 0 ? (totalInteractions / totalViews).toFixed(4) : 0}`,
  ].join("\n");

  return [
    "```yaml",
    yaml,
    "```",
    "",
    `vistas_a_${ageDays}_dias null = el video aún no cumple ${ageDays} días o no se capturó su ventana temprana.`,
    ...notes,
  ].join("\n");
}

/** Resumen de la cuenta: seguidores, momentum mensual y mejores franjas. */
export async function getGrowthSummary(params: { platform?: Platform } = {}) {
  const [{ videos, accountSeries }, snapshotSeries] = await Promise.all([
    readGrowth({ platform: params.platform }),
    readSnapshotSeries({ platform: params.platform }),
  ]);

  const summary = summarize(videos);
  const bestDay = bestBucket(viewsByWeekday(videos));
  const bestHour = bestBucket(viewsByHour(videos));

  return {
    accounts: accountSeries.map((s) => {
      const points = s.points.filter((p) => p.followers !== null);
      return {
        platform: s.platform,
        handle: s.handle,
        followers: points.at(-1)?.followers ?? null,
        firstCapturedAt: points[0]?.capturedAt ?? null,
        lastCapturedAt: points.at(-1)?.capturedAt ?? null,
      };
    }),
    catalog: {
      totalVideos: summary.totalVideos,
      totalViews: summary.totalViews,
      avgViews: Math.round(summary.avgViews),
      weightedEngagement: Number(summary.weightedEngagement.toFixed(4)),
    },
    gainedByMonth: gainedByMonth(snapshotSeries),
    bestSlot:
      bestDay && bestHour
        ? { day: bestDay.label, hour: bestHour.label }
        : null,
  };
}
