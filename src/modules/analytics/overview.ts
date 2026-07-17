import "server-only";

import { dayKey } from "@/core/lib/datetime";
import type { Platform } from "@/core/domain";
import {
  readGrowth,
  readSnapshotSeries,
  type AccountSeries,
} from "./history";
import { dailyFollowerDeltas } from "./attribution";
import {
  buildTimeline,
  type Granularity,
  type TimelineBucket,
} from "./timeline";
import {
  CREATOR_TIMEZONE,
  groupByContentType,
  type ContentTypeStat,
  type VideoWithMetrics,
} from "./insights";
import {
  resolvePeriod,
  sumOverPeriod,
  type Period,
  type PeriodGranularity,
} from "./period";

/** KPIs de un periodo: publicados + métricas GANADAS (deltas entre snapshots). */
export interface PeriodMetrics {
  videosPublished: number;
  views: number;
  likes: number;
  comments: number;
}

export interface SubBucketMetrics {
  key: string;
  label: string;
  combined: PeriodMetrics;
  tiktok: PeriodMetrics;
  instagram: PeriodMetrics;
}

/** Video más visto publicado en el periodo (para el digest / destacados). */
export interface BestVideo {
  externalId: string;
  platform: Platform;
  caption: string | null;
  /** vistas totales de por vida (≈ ganadas en el periodo si se publicó en él). */
  views: number;
}

export interface OverviewSummary {
  period: {
    granularity: PeriodGranularity;
    key: string;
    label: string;
    prevAnchor: string;
    nextAnchor: string | null;
    subGranularity: "day" | "week";
  };
  combined: PeriodMetrics & { followersGained: number | null };
  byPlatform: Record<Platform, PeriodMetrics>;
  /** seguidores ganados por plataforma (null = sin observación en el periodo). */
  followersByPlatform: Record<Platform, number | null>;
  subBuckets: SubBucketMetrics[];
  /** tipos de contenido de los videos PUBLICADOS en el periodo (ambas plataformas). */
  contentTypes: ContentTypeStat[];
  /** video más visto publicado en el periodo (o null si no se publicó nada). */
  bestVideo: BestVideo | null;
}

const PLATFORMS: Platform[] = ["tiktok", "instagram"];

/** Deltas diarios de seguidores de las series de cuenta de una plataforma. */
function followerDeltasFor(accountSeries: AccountSeries[]) {
  const points = accountSeries.flatMap((s) =>
    s.points.map((p) => ({
      capturedAt: new Date(p.capturedAt),
      followers: p.followers,
    })),
  );
  return dailyFollowerDeltas(points);
}

/** Map day key → valor, a partir de los buckets diarios del timeline. */
function dayMap(
  buckets: TimelineBucket[],
  select: (b: TimelineBucket) => number,
): Map<string, number> {
  return new Map(buckets.map((b) => [b.bucket, select(b)]));
}

/** Suma los seguidores ganados del periodo; null si no hubo observación. */
function followersInPeriod(
  period: Period,
  buckets: TimelineBucket[],
): number | null {
  const byDay = new Map(
    buckets
      .filter((b) => b.followersGained !== null)
      .map((b) => [b.bucket, b.followersGained as number]),
  );
  let sum = 0;
  let seen = false;
  for (const d of period.dayKeys) {
    const v = byDay.get(d);
    if (v !== undefined) {
      sum += v;
      seen = true;
    }
  }
  return seen ? sum : null;
}

interface PlatformData {
  platform: Platform;
  videos: VideoWithMetrics[];
  daily: TimelineBucket[];
}

/** Lee y agrega los buckets diarios de una plataforma (publicados + ganados). */
async function readPlatform(platform: Platform): Promise<PlatformData> {
  const [{ videos, accountSeries }, snapshotSeries] = await Promise.all([
    readGrowth({ platform }),
    readSnapshotSeries({ platform }),
  ]);
  const daily = buildTimeline(
    {
      publishedAt: videos.map((r) => r.video.publishedAt),
      snapshotSeries,
      followerDeltas: followerDeltasFor(accountSeries),
    },
    "day" satisfies Granularity,
  );
  return { platform, videos, daily };
}

/** Totales y por sub-bucket de una plataforma para el periodo dado. */
function metricsFor(period: Period, daily: TimelineBucket[]) {
  const views = sumOverPeriod(period, dayMap(daily, (b) => b.viewsGained));
  const likes = sumOverPeriod(period, dayMap(daily, (b) => b.likesGained));
  const comments = sumOverPeriod(period, dayMap(daily, (b) => b.commentsGained));
  const videos = sumOverPeriod(period, dayMap(daily, (b) => b.videosPublished));
  const total: PeriodMetrics = {
    videosPublished: videos.total,
    views: views.total,
    likes: likes.total,
    comments: comments.total,
  };
  const perBucket: PeriodMetrics[] = period.sub.buckets.map((_, i) => ({
    videosPublished: videos.perBucket[i],
    views: views.perBucket[i],
    likes: likes.perBucket[i],
    comments: comments.perBucket[i],
  }));
  return { total, perBucket };
}

const addMetrics = (a: PeriodMetrics, b: PeriodMetrics): PeriodMetrics => ({
  videosPublished: a.videosPublished + b.videosPublished,
  views: a.views + b.views,
  likes: a.likes + b.likes,
  comments: a.comments + b.comments,
});

/**
 * Resumen del Overview para un periodo (semana/mes). Cross-platform: devuelve
 * KPIs combinados y por plataforma, el desglose por sub-bucket (día/semana) y
 * los tipos de contenido de lo publicado en el periodo.
 */
export async function readOverviewSummary(opts: {
  granularity: PeriodGranularity;
  anchor?: string;
}): Promise<OverviewSummary> {
  const today = dayKey(new Date(), CREATOR_TIMEZONE);
  const period = resolvePeriod(opts.granularity, opts.anchor, today);

  const data = await Promise.all(PLATFORMS.map(readPlatform));
  const byName = new Map(data.map((d) => [d.platform, d]));

  const per = new Map(
    data.map((d) => [d.platform, metricsFor(period, d.daily)]),
  );
  const tk = per.get("tiktok")!;
  const ig = per.get("instagram")!;

  // Seguidores ganados (combinado, sumando ambas plataformas).
  const tkFollowers = followersInPeriod(period, byName.get("tiktok")!.daily);
  const igFollowers = followersInPeriod(period, byName.get("instagram")!.daily);
  const followersGained =
    tkFollowers === null && igFollowers === null
      ? null
      : (tkFollowers ?? 0) + (igFollowers ?? 0);

  const subBuckets: SubBucketMetrics[] = period.sub.buckets.map((b, i) => ({
    key: b.key,
    label: b.label,
    tiktok: tk.perBucket[i],
    instagram: ig.perBucket[i],
    combined: addMetrics(tk.perBucket[i], ig.perBucket[i]),
  }));

  // Tipos de contenido: videos publicados en el periodo (ambas plataformas).
  const periodDays = new Set(period.dayKeys);
  const publishedInPeriod = data
    .flatMap((d) => d.videos)
    .filter((r) => periodDays.has(dayKey(r.video.publishedAt, CREATOR_TIMEZONE)));

  const bestRow = publishedInPeriod.length
    ? publishedInPeriod.reduce((a, b) =>
        b.metrics.views > a.metrics.views ? b : a,
      )
    : null;

  return {
    period: {
      granularity: period.granularity,
      key: period.key,
      label: period.label,
      prevAnchor: period.prevAnchor,
      nextAnchor: period.nextAnchor,
      subGranularity: period.sub.granularity,
    },
    combined: { ...addMetrics(tk.total, ig.total), followersGained },
    byPlatform: { tiktok: tk.total, instagram: ig.total },
    followersByPlatform: { tiktok: tkFollowers, instagram: igFollowers },
    subBuckets,
    contentTypes: groupByContentType(publishedInPeriod),
    bestVideo: bestRow
      ? {
          externalId: bestRow.video.externalId,
          platform: bestRow.video.platform,
          caption: bestRow.video.caption,
          views: bestRow.metrics.views,
        }
      : null,
  };
}
