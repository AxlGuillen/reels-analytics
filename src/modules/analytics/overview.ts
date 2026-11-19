import "server-only";

import { dayKey } from "@/core/lib/datetime";
import type { Platform } from "@/core/domain";
import { followerDeltasByDay } from "./attribution";
import { analyticsCache, readGrowthCached, type ScopeOptions } from "./cached";
import { readSnapshotSeries, resolveAccounts, type ScopedAccount } from "./history";
import {
  CREATOR_TIMEZONE,
  groupByContentType,
  type ContentTypeStat,
  type VideoWithMetrics,
} from "./insights";
import {
  aggregateAccounts,
  type AccountBreakdown,
  type AccountPeriod,
  type PeriodMetrics,
  type SubBucketMetrics,
} from "./overview-shape";
import {
  periodProgress,
  resolvePeriod,
  sumOverPeriod,
  type Period,
  type PeriodGranularity,
} from "./period";
import {
  buildTimeline,
  type Granularity,
  type TimelineBucket,
} from "./timeline";

export type { AccountBreakdown, PeriodMetrics, SubBucketMetrics } from "./overview-shape";

/** Video más visto publicado en el periodo (para el digest / destacados). */
export interface BestVideo {
  externalId: string;
  platform: Platform;
  caption: string | null;
  /** vistas totales de por vida (≈ ganadas en el periodo si se publicó en él). */
  views: number;
  /** @handle de la cuenta dueña: con varias cuentas, dice de cuál es el hit. */
  account: string | null;
}

export interface OverviewSummary {
  period: {
    granularity: PeriodGranularity;
    key: string;
    label: string;
    prevAnchor: string;
    nextAnchor: string | null;
    subGranularity: "day" | "week";
    /** true si el periodo mostrado contiene a hoy. */
    isCurrent: boolean;
    /** días del periodo ya transcurridos (incluye hoy) y total. */
    daysElapsed: number;
    daysTotal: number;
  };
  combined: PeriodMetrics & { followersGained: number | null };
  byPlatform: Record<Platform, PeriodMetrics>;
  /** seguidores ganados por plataforma (null = sin observación en el periodo). */
  followersByPlatform: Record<Platform, number | null>;
  /** una fila por cuenta del alcance; su suma es `combined`. */
  byAccount: AccountBreakdown[];
  subBuckets: SubBucketMetrics[];
  /** tipos de contenido de los videos PUBLICADOS en el periodo (todo el alcance). */
  contentTypes: ContentTypeStat[];
  /** video más visto publicado en el periodo (o null si no se publicó nada). */
  bestVideo: BestVideo | null;
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

/**
 * Buckets diarios de UNA cuenta (publicados + ganados), cacheados: es la
 * lectura cara (toda la historia de snapshots) y no depende del periodo, así
 * que navegar entre semanas/meses solo recorta este resultado. Por cuenta y no
 * por plataforma: cada cuenta mide sus propios seguidores, nunca mezclados.
 */
const dailyFor = analyticsCache("daily", async (accountId: string) => {
  const scope: ScopeOptions = { account: { accountId } };
  const [{ videos, accountSeries }, snapshotSeries] = await Promise.all([
    readGrowthCached(scope),
    readSnapshotSeries(scope),
  ]);
  return buildTimeline(
    {
      publishedAt: videos.map((r) => r.video.publishedAt),
      snapshotSeries,
      followerDeltas: followerDeltasByDay(accountSeries),
    },
    "day" satisfies Granularity,
  );
});

interface AccountData {
  account: ScopedAccount;
  videos: VideoWithMetrics[];
  daily: TimelineBucket[];
}

/** Catálogo + buckets diarios de una cuenta (ambos del caché). */
async function readAccount(account: ScopedAccount): Promise<AccountData> {
  const [{ videos }, daily] = await Promise.all([
    readGrowthCached({ account: { accountId: account.accountId } }),
    dailyFor(account.accountId),
  ]);
  return { account, videos, daily };
}

/** Totales y por sub-bucket de una cuenta para el periodo dado. */
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

/**
 * Resumen del Overview para un periodo (semana/mes) y un alcance de cuentas.
 * Cada cuenta se mide por separado y `aggregateAccounts` arma el total, el
 * reparto por plataforma y el desglose por cuenta desde la misma lista: la
 * fila de total del desglose siempre cuadra con los KPIs.
 */
export async function readOverviewSummary(opts: {
  granularity: PeriodGranularity;
  anchor?: string;
  /** cuentas a incluir; por defecto, las principales (ver `AccountScope`). */
  scope?: ScopeOptions;
}): Promise<OverviewSummary> {
  const today = dayKey(new Date(), CREATOR_TIMEZONE);
  const period = resolvePeriod(opts.granularity, opts.anchor, today);

  const accounts = await resolveAccounts(opts.scope ?? {});
  const data = await Promise.all(accounts.map(readAccount));

  const measured: AccountPeriod[] = data.map(({ account, daily }) => ({
    ...account,
    ...metricsFor(period, daily),
    followersGained: followersInPeriod(period, daily),
  }));
  const totals = aggregateAccounts(measured, period.sub.buckets);

  // Tipos de contenido y mejor video: lo publicado en el periodo, todo el alcance.
  const periodDays = new Set(period.dayKeys);
  const publishedInPeriod = data
    .flatMap((d) => d.videos)
    .filter((r) => periodDays.has(dayKey(r.video.publishedAt, CREATOR_TIMEZONE)));

  const bestRow = publishedInPeriod.length
    ? publishedInPeriod.reduce((a, b) =>
        b.metrics.views > a.metrics.views ? b : a,
      )
    : null;
  const handleOf = new Map(accounts.map((a) => [a.accountId, a.handle]));

  return {
    period: {
      granularity: period.granularity,
      key: period.key,
      label: period.label,
      prevAnchor: period.prevAnchor,
      nextAnchor: period.nextAnchor,
      subGranularity: period.sub.granularity,
      ...periodProgress(period, today),
    },
    combined: totals.combined,
    byPlatform: totals.byPlatform,
    followersByPlatform: totals.followersByPlatform,
    byAccount: totals.byAccount,
    subBuckets: totals.subBuckets,
    contentTypes: groupByContentType(publishedInPeriod),
    bestVideo: bestRow
      ? {
          externalId: bestRow.video.externalId,
          platform: bestRow.video.platform,
          caption: bestRow.video.caption,
          views: bestRow.metrics.views,
          account: bestRow.video.accountId
            ? (handleOf.get(bestRow.video.accountId) ?? null)
            : null,
        }
      : null,
  };
}
