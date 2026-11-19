import { PLATFORMS, type Platform } from "@/core/domain";

/**
 * Cómo se suman las CUENTAS en el Overview. Puro y testeado.
 *
 * Cada cuenta se mide por separado (sus propios deltas y seguidores) y recién
 * aquí se compone: el total general, el reparto por plataforma y el desglose
 * por cuenta salen de la misma lista, así que la fila de total del desglose
 * siempre cuadra con los KPIs de arriba.
 */

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

/** Una cuenta ya medida en el periodo. */
export interface AccountPeriod {
  accountId: string;
  platform: Platform;
  handle: string | null;
  isPrimary: boolean;
  total: PeriodMetrics;
  /** una entrada por sub-bucket del periodo, en el mismo orden. */
  perBucket: PeriodMetrics[];
  /** seguidores ganados en el periodo (null = sin observación). */
  followersGained: number | null;
}

/** Fila del desglose por cuenta. */
export interface AccountBreakdown {
  accountId: string;
  platform: Platform;
  handle: string | null;
  isPrimary: boolean;
  metrics: PeriodMetrics;
  followersGained: number | null;
}

export const ZERO_METRICS: PeriodMetrics = {
  videosPublished: 0,
  views: 0,
  likes: 0,
  comments: 0,
};

export const addMetrics = (a: PeriodMetrics, b: PeriodMetrics): PeriodMetrics => ({
  videosPublished: a.videosPublished + b.videosPublished,
  views: a.views + b.views,
  likes: a.likes + b.likes,
  comments: a.comments + b.comments,
});

/** Suma que respeta "sin dato": null solo si TODOS son null. */
export function sumNullable(values: (number | null)[]): number | null {
  const seen = values.filter((v): v is number => v !== null);
  return seen.length ? seen.reduce((a, b) => a + b, 0) : null;
}

export function aggregateAccounts(
  accounts: AccountPeriod[],
  buckets: { key: string; label: string }[],
): {
  combined: PeriodMetrics & { followersGained: number | null };
  byPlatform: Record<Platform, PeriodMetrics>;
  followersByPlatform: Record<Platform, number | null>;
  subBuckets: SubBucketMetrics[];
  byAccount: AccountBreakdown[];
} {
  const ofPlatform = (p: Platform) => accounts.filter((a) => a.platform === p);

  const byPlatform = Object.fromEntries(
    PLATFORMS.map((p) => [p, ofPlatform(p).reduce((m, a) => addMetrics(m, a.total), ZERO_METRICS)]),
  ) as Record<Platform, PeriodMetrics>;

  const followersByPlatform = Object.fromEntries(
    PLATFORMS.map((p) => [p, sumNullable(ofPlatform(p).map((a) => a.followersGained))]),
  ) as Record<Platform, number | null>;

  const bucketSum = (p: Platform, i: number) =>
    ofPlatform(p).reduce((m, a) => addMetrics(m, a.perBucket[i] ?? ZERO_METRICS), ZERO_METRICS);

  const subBuckets: SubBucketMetrics[] = buckets.map((b, i) => {
    const tiktok = bucketSum("tiktok", i);
    const instagram = bucketSum("instagram", i);
    return { key: b.key, label: b.label, tiktok, instagram, combined: addMetrics(tiktok, instagram) };
  });

  return {
    combined: {
      ...accounts.reduce((m, a) => addMetrics(m, a.total), ZERO_METRICS),
      followersGained: sumNullable(accounts.map((a) => a.followersGained)),
    },
    byPlatform,
    followersByPlatform,
    subBuckets,
    byAccount: accounts.map((a) => ({
      accountId: a.accountId,
      platform: a.platform,
      handle: a.handle,
      isPrimary: a.isPrimary,
      metrics: a.total,
      followersGained: a.followersGained,
    })),
  };
}
