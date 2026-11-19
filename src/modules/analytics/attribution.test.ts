import { describe, expect, test } from "bun:test";
import type { Platform } from "@/core/domain";
import type { VideoWithMetrics } from "./insights";
import {
  attributeFollowers,
  dailyFollowerDeltas,
  followerDeltasByDay,
  type FollowerDelta,
} from "./attribution";

function video(externalId: string, publishedAt: string, platform: Platform = "tiktok"): VideoWithMetrics {
  return {
    video: {
      platform,
      externalId,
      caption: null,
      hashtags: [],
      publishedAt: new Date(publishedAt),
      url: null,
      durationSeconds: null,
    },
    metrics: {
      platform,
      externalId,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saved: null,
      capturedAt: new Date(publishedAt),
    },
  };
}

const snap = (iso: string, followers: number | null) => ({
  capturedAt: new Date(iso),
  followers,
});

describe("dailyFollowerDeltas", () => {
  test("last capture per day wins; deltas between observed days", () => {
    const deltas = dailyFollowerDeltas(
      [
        snap("2026-07-01T08:00:00Z", 900), // pisada por la de las 20:00
        snap("2026-07-01T20:00:00Z", 1000),
        snap("2026-07-02T08:00:00Z", 1040),
        snap("2026-07-04T08:00:00Z", 1100), // hueco: 3 y 4 en un solo delta
      ],
      "UTC",
    );
    // Atribuidos al día donde INICIA la ventana (la observación anterior).
    expect(deltas).toEqual([
      { day: "2026-07-01", delta: 40, spanDays: 1 },
      { day: "2026-07-02", delta: 60, spanDays: 2 },
    ]);
  });

  test("null followers are skipped; single day yields no deltas", () => {
    expect(
      dailyFollowerDeltas([snap("2026-07-01T08:00:00Z", null)], "UTC"),
    ).toEqual([]);
    expect(
      dailyFollowerDeltas([snap("2026-07-01T08:00:00Z", 100)], "UTC"),
    ).toEqual([]);
  });
});

describe("attributeFollowers", () => {
  const deltas: FollowerDelta[] = [
    { day: "2026-07-02", delta: 40, spanDays: 1 },
    { day: "2026-07-03", delta: 5, spanDays: 1 },
    { day: "2026-07-05", delta: 80, spanDays: 1 },
  ];
  const byPlatform = new Map<Platform, FollowerDelta[]>([["tiktok", deltas]]);

  test("sums the deltas inside each video's window and sorts desc", () => {
    const result = attributeFollowers(
      [
        video("a", "2026-07-02T10:00:00Z"), // ventana 2-3 → 45
        video("b", "2026-07-05T10:00:00Z"), // ventana 5-6 → 80
      ],
      byPlatform,
      "UTC",
    );
    expect(result.map((r) => [r.row.video.externalId, r.gained])).toEqual([
      ["b", 80],
      ["a", 45],
    ]);
    expect(result.every((r) => !r.sharedWindow)).toBe(true);
  });

  test("marks videos whose windows overlap on the same platform", () => {
    const result = attributeFollowers(
      [video("a", "2026-07-02T08:00:00Z"), video("b", "2026-07-03T08:00:00Z")],
      byPlatform,
      "UTC",
    );
    expect(result.every((r) => r.sharedWindow)).toBe(true);
  });

  test("omits videos without observed deltas in their window", () => {
    const result = attributeFollowers(
      [video("viejo", "2026-06-01T08:00:00Z")],
      byPlatform,
      "UTC",
    );
    expect(result).toEqual([]);
  });

  test("videos on another platform don't share windows nor deltas", () => {
    const result = attributeFollowers(
      [video("a", "2026-07-02T08:00:00Z"), video("b", "2026-07-02T09:00:00Z", "instagram")],
      byPlatform,
      "UTC",
    );
    // El de IG no tiene deltas (no hay serie de IG) → solo queda el de TikTok, sin compartir.
    expect(result).toHaveLength(1);
    expect(result[0].sharedWindow).toBe(false);
  });
});

describe("varias cuentas en la misma plataforma", () => {
  const withAccount = (row: VideoWithMetrics, accountId: string): VideoWithMetrics => ({
    ...row,
    video: { ...row.video, accountId },
  });

  test("followerDeltasByDay calcula por cuenta y luego suma", () => {
    // Una cuenta de miles y una de decenas, capturadas los mismos días. Aplanar
    // sus lecturas tomaría "la última del día" de cualquiera de las dos y
    // fabricaría deltas de ±8.950; por cuenta, cada una ganó 10.
    const deltas = followerDeltasByDay([
      {
        points: [
          { capturedAt: "2026-11-02T14:00:00Z", followers: 9000 },
          { capturedAt: "2026-11-03T14:00:00Z", followers: 9010 },
        ],
      },
      {
        points: [
          { capturedAt: "2026-11-02T14:00:01Z", followers: 50 },
          { capturedAt: "2026-11-03T14:00:01Z", followers: 60 },
        ],
      },
    ]);
    expect(deltas).toEqual([{ day: "2026-11-02", delta: 20 }]);
  });

  test("un video solo se lleva crédito de los seguidores de SU cuenta", () => {
    const deltasByAccount = new Map<string, FollowerDelta[]>([
      ["main", [{ day: "2026-11-02", delta: 500, spanDays: 1 }]],
      ["valo", [{ day: "2026-11-02", delta: 3, spanDays: 1 }]],
    ]);
    const main = withAccount(video("m1", "2026-11-02T20:00:00Z"), "main");
    const valo = withAccount(video("v1", "2026-11-02T20:00:00Z"), "valo");
    const result = attributeFollowers([main, valo], deltasByAccount);

    expect(result.find((r) => r.row.video.externalId === "m1")?.gained).toBe(500);
    expect(result.find((r) => r.row.video.externalId === "v1")?.gained).toBe(3);
    // Misma plataforma y misma ventana, pero cuentas distintas: no la comparten.
    expect(result.every((r) => !r.sharedWindow)).toBe(true);
  });
});
