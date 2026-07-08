import { describe, expect, test } from "bun:test";
import { weekKey } from "@/core/lib/datetime";
import { buildTimeline, type SnapshotPoint } from "./timeline";

const snap = (
  iso: string,
  views: number,
  likes = 0,
  comments = 0,
  shares = 0,
): SnapshotPoint => ({ capturedAt: new Date(iso), views, likes, comments, shares });

describe("weekKey", () => {
  test("maps any weekday to that week's Monday", () => {
    // 2026-07-06 es lunes.
    expect(weekKey(new Date("2026-07-06T10:00:00Z"), "UTC")).toBe("2026-07-06");
    expect(weekKey(new Date("2026-07-08T10:00:00Z"), "UTC")).toBe("2026-07-06");
    expect(weekKey(new Date("2026-07-12T23:00:00Z"), "UTC")).toBe("2026-07-06");
    // El domingo anterior pertenece a la semana previa.
    expect(weekKey(new Date("2026-07-05T10:00:00Z"), "UTC")).toBe("2026-06-29");
  });
});

describe("buildTimeline", () => {
  const input = {
    publishedAt: [
      new Date("2026-07-06T15:00:00Z"),
      new Date("2026-07-06T20:00:00Z"),
      new Date("2026-07-07T15:00:00Z"),
    ],
    snapshotSeries: [
      [
        snap("2026-07-06T08:00:00Z", 100, 10),
        snap("2026-07-07T08:00:00Z", 300, 25, 2, 1), // +200v +15l +2c +1s → día 7
        snap("2026-07-08T08:00:00Z", 350, 30), // +50v +5l -2c -1s → día 8
      ],
      [snap("2026-07-07T08:00:00Z", 40), snap("2026-07-08T08:00:00Z", 90)], // +50 → día 8
    ],
    followerDeltas: [
      { day: "2026-07-07", delta: 12 },
      { day: "2026-07-08", delta: -2 },
    ],
  };

  test("daily buckets: published counts, metric deltas, follower gains", () => {
    const t = buildTimeline(input, "day", "UTC");
    expect(t.map((b) => b.bucket)).toEqual(["2026-07-06", "2026-07-07", "2026-07-08"]);

    const day6 = t[0];
    expect(day6.videosPublished).toBe(2);
    expect(day6.viewsGained).toBe(0); // primer snapshot no aporta delta
    expect(day6.followersGained).toBeNull(); // sin observación ese día

    const day7 = t[1];
    expect(day7).toMatchObject({
      videosPublished: 1,
      viewsGained: 200,
      likesGained: 15,
      commentsGained: 2,
      sharesGained: 1,
      followersGained: 12,
    });

    const day8 = t[2];
    expect(day8.viewsGained).toBe(100); // 50 + 50 de ambos videos
    expect(day8.followersGained).toBe(-2);
  });

  test("weekly buckets roll everything into the Monday key", () => {
    const t = buildTimeline(input, "week", "UTC");
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({
      bucket: "2026-07-06",
      videosPublished: 3,
      viewsGained: 300,
      followersGained: 10,
    });
  });

  test("monthly buckets use YYYY-MM keys", () => {
    const t = buildTimeline(input, "month", "UTC");
    expect(t).toHaveLength(1);
    expect(t[0].bucket).toBe("2026-07");
    expect(t[0].likesGained).toBe(20);
  });

  test("empty input yields no buckets", () => {
    expect(
      buildTimeline(
        { publishedAt: [], snapshotSeries: [], followerDeltas: [] },
        "day",
        "UTC",
      ),
    ).toEqual([]);
  });
});
