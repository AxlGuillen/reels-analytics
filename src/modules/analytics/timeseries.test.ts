import { describe, expect, test } from "bun:test";
import {
  initialVelocity,
  toAgePoints,
  viewsAtAge,
  type AgePoint,
} from "./timeseries";

const pub = new Date("2026-01-01T00:00:00Z");
const day = (n: number) => new Date(pub.getTime() + n * 86_400_000);

describe("toAgePoints", () => {
  test("computes age in days and sorts ascending", () => {
    const points = toAgePoints(pub, [
      { capturedAt: day(5), views: 500 },
      { capturedAt: day(1), views: 100 },
    ]);
    expect(points).toEqual([
      { ageDays: 1, views: 100 },
      { ageDays: 5, views: 500 },
    ]);
  });

  test("drops snapshots captured before publish", () => {
    const points = toAgePoints(pub, [{ capturedAt: day(-2), views: 10 }]);
    expect(points).toHaveLength(0);
  });
});

describe("viewsAtAge", () => {
  const points: AgePoint[] = [
    { ageDays: 2, views: 1000 },
    { ageDays: 9, views: 8000 },
  ];

  test("interpolates linearly between bracketing snapshots", () => {
    // age 7 is 5/7 of the way from day 2 to day 9: 1000 + (5/7)*7000 = 6000
    expect(viewsAtAge(points, 7)).toBe(6000);
  });

  test("returns the exact value when a snapshot lands on the target", () => {
    expect(viewsAtAge([{ ageDays: 7, views: 4200 }], 7)).toBe(4200);
  });

  test("returns null when the video is younger than the target (no upper bracket)", () => {
    expect(viewsAtAge([{ ageDays: 1, views: 300 }], 7)).toBeNull();
  });

  test("returns null when tracking started too late (no lower bracket)", () => {
    // First real snapshot already at age 10 → can't reconstruct day 7 honestly.
    expect(viewsAtAge([{ ageDays: 10, views: 9000 }], 7)).toBeNull();
  });

  test("returns null for an empty series", () => {
    expect(viewsAtAge([], 7)).toBeNull();
  });
});

describe("initialVelocity", () => {
  test("views per day over the first window", () => {
    // last snapshot within 3 days is day 2 with 900 views → 450/day
    expect(
      initialVelocity([
        { ageDays: 1, views: 500 },
        { ageDays: 2, views: 900 },
        { ageDays: 9, views: 8000 },
      ]),
    ).toBe(450);
  });

  test("returns null when the early window was missed", () => {
    expect(initialVelocity([{ ageDays: 5, views: 4000 }])).toBeNull();
  });

  test("returns null for an empty series", () => {
    expect(initialVelocity([])).toBeNull();
  });
});
