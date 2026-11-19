import { describe, expect, test } from "bun:test";
import {
  addMetrics,
  aggregateAccounts,
  sumNullable,
  ZERO_METRICS,
  type AccountPeriod,
  type PeriodMetrics,
} from "./overview-shape";

const m = (views: number, videosPublished = 1, likes = 0, comments = 0): PeriodMetrics => ({
  videosPublished,
  views,
  likes,
  comments,
});

const account = (over: Partial<AccountPeriod> & Pick<AccountPeriod, "accountId" | "platform">): AccountPeriod => ({
  handle: over.accountId,
  isPrimary: false,
  total: ZERO_METRICS,
  perBucket: [ZERO_METRICS, ZERO_METRICS],
  followersGained: null,
  ...over,
});

const BUCKETS = [
  { key: "2026-11-02", label: "Lun" },
  { key: "2026-11-03", label: "Mar" },
];

describe("aggregateAccounts", () => {
  const accounts: AccountPeriod[] = [
    account({
      accountId: "main",
      platform: "tiktok",
      isPrimary: true,
      total: m(1000, 5),
      perBucket: [m(600, 3), m(400, 2)],
      followersGained: 50,
    }),
    account({
      accountId: "valo",
      platform: "tiktok",
      total: m(30, 2),
      perBucket: [m(10, 1), m(20, 1)],
      followersGained: 7,
    }),
    account({
      accountId: "ig",
      platform: "instagram",
      isPrimary: true,
      total: m(200, 3),
      perBucket: [m(150, 2), m(50, 1)],
      followersGained: null,
    }),
  ];
  const result = aggregateAccounts(accounts, BUCKETS);

  test("el total general es la suma de todas las cuentas", () => {
    expect(result.combined.views).toBe(1230);
    expect(result.combined.videosPublished).toBe(10);
    expect(result.combined.followersGained).toBe(57);
  });

  test("el reparto por plataforma suma las cuentas de cada una", () => {
    expect(result.byPlatform.tiktok.views).toBe(1030);
    expect(result.byPlatform.instagram.views).toBe(200);
    expect(result.followersByPlatform.tiktok).toBe(57);
    // Sin observación en IG: sigue siendo "sin dato", no cero.
    expect(result.followersByPlatform.instagram).toBeNull();
  });

  test("los sub-buckets suman por plataforma y en conjunto", () => {
    expect(result.subBuckets[0].tiktok.views).toBe(610);
    expect(result.subBuckets[0].instagram.views).toBe(150);
    expect(result.subBuckets[0].combined.views).toBe(760);
    expect(result.subBuckets[1].combined.views).toBe(470);
  });

  test("las filas del desglose cuadran con el total (invariante del reporte)", () => {
    expect(result.byAccount.map((a) => a.accountId)).toEqual(["main", "valo", "ig"]);
    const sum = result.byAccount.reduce((acc, a) => addMetrics(acc, a.metrics), ZERO_METRICS);
    expect(sum).toEqual({
      videosPublished: result.combined.videosPublished,
      views: result.combined.views,
      likes: result.combined.likes,
      comments: result.combined.comments,
    });
  });

  test("una plataforma sin cuentas en el alcance queda en cero", () => {
    const onlyValo = aggregateAccounts([accounts[1]], BUCKETS);
    expect(onlyValo.byPlatform.instagram).toEqual(ZERO_METRICS);
    expect(onlyValo.combined.views).toBe(30);
  });
});

describe("sumNullable", () => {
  test("null solo si todos son null", () => {
    expect(sumNullable([null, null])).toBeNull();
    expect(sumNullable([])).toBeNull();
    expect(sumNullable([null, 4, -1])).toBe(3);
  });
});
