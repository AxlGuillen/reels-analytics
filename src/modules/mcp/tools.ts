import "server-only";
import type { Platform } from "@/core/domain";
import {
  classifyContentType,
  contentTypeLabel,
  type ContentTypeKey,
} from "@/core/lib/content-type";
import { readVideoBenchmark } from "@/modules/analytics/breakouts";
import {
  readGrowth,
  readSnapshotSeries,
  readVideoHistory,
} from "@/modules/analytics/history";
import {
  bestBucket,
  engagementRate,
  gainedByMonth,
  summarize,
  viewsByHour,
  viewsByWeekday,
  type VideoWithMetrics,
} from "@/modules/analytics/insights";
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
