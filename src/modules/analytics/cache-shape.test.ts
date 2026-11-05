import { describe, expect, test } from "bun:test";
import {
  mergeGrowth,
  mergeMonthGained,
  reviveGrowth,
  serializeGrowth,
} from "./cache-shape";
import type { GrowthData } from "./history";

const growth = (platform: "tiktok" | "instagram", id: string): GrowthData => ({
  videos: [
    {
      video: {
        platform,
        externalId: id,
        caption: "Día 5 #dui",
        hashtags: ["dui"],
        publishedAt: new Date("2026-09-01T18:30:00.000Z"),
        url: null,
        durationSeconds: 47,
        thumbnailUrl: null,
      },
      metrics: {
        platform,
        externalId: id,
        views: 92_453,
        likes: 10,
        comments: 2,
        shares: 1,
        saved: null,
        capturedAt: new Date("2026-09-24T14:22:56.303Z"),
      },
    },
  ],
  accountSeries: [
    {
      platform,
      handle: "@x",
      points: [
        { capturedAt: "2026-09-24T14:22:56Z", followers: 10, totalViews: null, totalLikes: null },
      ],
    },
  ],
});

describe("serializeGrowth / reviveGrowth", () => {
  test("ida y vuelta por JSON conserva las fechas como Date", () => {
    const original = growth("tiktok", "a");
    const viaCache = JSON.parse(JSON.stringify(serializeGrowth(original)));
    const revived = reviveGrowth(viaCache);
    expect(revived).toEqual(original);
    expect(revived.videos[0].video.publishedAt).toBeInstanceOf(Date);
    expect(revived.videos[0].metrics.capturedAt).toBeInstanceOf(Date);
  });

  test("lo serializado ya es JSON puro (sin Date)", () => {
    const s = serializeGrowth(growth("tiktok", "a"));
    expect(typeof s.videos[0].video.publishedAt).toBe("string");
    expect(typeof s.videos[0].metrics.capturedAt).toBe("string");
  });
});

describe("mergeGrowth", () => {
  test("une videos y series de las plataformas", () => {
    const merged = mergeGrowth([growth("tiktok", "a"), growth("instagram", "b")]);
    expect(merged.videos.map((v) => v.video.externalId)).toEqual(["a", "b"]);
    expect(merged.accountSeries.map((s) => s.platform)).toEqual(["tiktok", "instagram"]);
  });
});

describe("mergeMonthGained", () => {
  test("suma el mismo mes entre plataformas y ordena cronológico", () => {
    const merged = mergeMonthGained([
      [
        { month: "2026-09", label: "sep 2026", gained: 100 },
        { month: "2026-08", label: "ago 2026", gained: 40 },
      ],
      [{ month: "2026-09", label: "sep 2026", gained: 5 }],
    ]);
    expect(merged).toEqual([
      { month: "2026-08", label: "ago 2026", gained: 40 },
      { month: "2026-09", label: "sep 2026", gained: 105 },
    ]);
  });

  test("no muta las entradas de origen", () => {
    const tt = [{ month: "2026-09", label: "sep 2026", gained: 1 }];
    mergeMonthGained([tt, [{ month: "2026-09", label: "sep 2026", gained: 2 }]]);
    expect(tt[0].gained).toBe(1);
  });
});
