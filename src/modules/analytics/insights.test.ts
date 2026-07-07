import { describe, expect, test } from "bun:test";
import type { VideoWithMetrics } from "./insights";
import {
  captionStats,
  gainedByMonth,
  summarize,
  viewsByDuration,
} from "./insights";

/** Video mínimo para tests; solo importan los campos que cada función lee. */
function row(overrides: {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  durationSeconds?: number | null;
  caption?: string | null;
}): VideoWithMetrics {
  return {
    video: {
      platform: "tiktok",
      externalId: "x",
      caption: overrides.caption ?? null,
      hashtags: [],
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      url: null,
      durationSeconds: overrides.durationSeconds ?? null,
    },
    metrics: {
      platform: "tiktok",
      externalId: "x",
      views: overrides.views ?? 0,
      likes: overrides.likes ?? 0,
      comments: overrides.comments ?? 0,
      shares: overrides.shares ?? 0,
      saved: null,
      capturedAt: new Date("2026-02-01T00:00:00Z"),
    },
  };
}

describe("summarize.weightedEngagement", () => {
  test("weights by audience instead of averaging ratios", () => {
    const rows = [
      row({ views: 100, likes: 50 }), // 50% rate, tiny video
      row({ views: 100_000, likes: 1000 }), // 1% rate, big video
    ];
    const s = summarize(rows);
    // Promedio simple: (0.5 + 0.01) / 2 = 25.5% — dominado por el video chico.
    expect(s.avgEngagement).toBeCloseTo(0.255);
    // Ponderado: 1050 / 100100 ≈ 1.05% — refleja la audiencia real.
    expect(s.weightedEngagement).toBeCloseTo(1050 / 100_100);
  });
});

describe("viewsByDuration", () => {
  test("buckets by duration and skips videos without one", () => {
    const buckets = viewsByDuration([
      row({ durationSeconds: 15, views: 1000 }),
      row({ durationSeconds: 30, views: 2000 }),
      row({ durationSeconds: 35, views: 4000 }),
      row({ durationSeconds: null, views: 99_999 }), // IG: sin duración
    ]);
    expect(buckets[0]).toEqual({ label: "< 20 s", avgViews: 1000, count: 1 });
    expect(buckets[1]).toEqual({ label: "20–40 s", avgViews: 3000, count: 2 });
    expect(buckets[3].count).toBe(0);
  });
});

describe("captionStats", () => {
  test("measures the text before hashtags, question and emoji", () => {
    const rows = [
      row({ caption: "#solo #tags", views: 100 }),
      row({ caption: "¿Subes o bajas de elo? #lol", views: 300 }),
      row({ caption: "Corto 🔥 #x", views: 500 }),
    ];
    const stats = new Map(captionStats(rows).map((s) => [s.label, s]));
    expect(stats.get("Sin texto (solo hashtags)")?.count).toBe(1);
    expect(stats.get("Corto (≤ 50)")?.count).toBe(2);
    expect(stats.get("Con pregunta")?.avgViews).toBe(300);
    expect(stats.get("Con emoji")?.avgViews).toBe(500);
  });
});

describe("gainedByMonth", () => {
  const snap = (iso: string, views: number) => ({
    capturedAt: new Date(iso),
    views,
  });

  test("sums per-month deltas across videos, first snapshot contributes none", () => {
    const result = gainedByMonth(
      [
        [
          snap("2026-06-28T12:00:00Z", 1000), // primer snapshot: sin delta
          snap("2026-06-30T12:00:00Z", 1500), // +500 en junio
          snap("2026-07-02T12:00:00Z", 2500), // +1000 en julio
        ],
        [snap("2026-07-01T12:00:00Z", 100), snap("2026-07-03T12:00:00Z", 300)], // +200 julio
      ],
      "UTC",
    );
    expect(result).toEqual([
      { month: "2026-06", label: expect.stringContaining("2026"), gained: 500 },
      { month: "2026-07", label: expect.stringContaining("2026"), gained: 1200 },
    ]);
  });

  test("empty input yields no months", () => {
    expect(gainedByMonth([], "UTC")).toEqual([]);
  });
});
