import { describe, expect, test } from "bun:test";
import {
  benchmarkAgainstCohort,
  initialVelocity,
  isBreakout,
  median,
  medianCurve,
  medianViewsAt,
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

/** Serie sintética lineal: `rate` vistas/día, snapshots en los días dados. */
function linear(rate: number, days: number[]): AgePoint[] {
  return days.map((d) => ({ ageDays: d, views: rate * d }));
}

// Cohorte de 4 videos con tasas 100/200/300/400 → mediana 250/día.
const COHORT: AgePoint[][] = [100, 200, 300, 400].map((rate) =>
  linear(rate, [1, 5, 10]),
);

describe("median", () => {
  test("odd and even lengths", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  test("null for empty", () => {
    expect(median([])).toBeNull();
  });
});

describe("medianViewsAt", () => {
  test("median of interpolated cohort values", () => {
    expect(medianViewsAt(COHORT, 5)).toBe(250 * 5);
  });

  test("null when fewer than minCohort videos bracket the age", () => {
    // A los 20 días ningún video del cohorte tiene snapshot superior.
    expect(medianViewsAt(COHORT, 20)).toBeNull();
    // Con solo 3 series y minCohort=4 tampoco alcanza.
    expect(medianViewsAt(COHORT.slice(0, 3), 5)).toBeNull();
  });
});

describe("medianCurve", () => {
  test("builds the typical curve and stops where the cohort thins out", () => {
    const curve = medianCurve(COHORT, 15);
    expect(curve[0]).toEqual({ ageDays: 1, views: 250 });
    expect(curve[curve.length - 1]).toEqual({ ageDays: 10, views: 2500 });
    expect(curve).toHaveLength(10);
  });
});

describe("benchmarkAgainstCohort / isBreakout", () => {
  test("compares at the largest common age and computes the multiple", () => {
    // Video a 600/día, con snapshots hasta el día 8 → compara a los 8 días.
    const video = linear(600, [1, 4, 8]);
    const result = benchmarkAgainstCohort(video, COHORT);
    expect(result).toEqual({
      multiple: 600 / 250,
      atAgeDays: 8,
      videoViews: 4800,
      medianViews: 2000,
    });
    expect(isBreakout(video, COHORT)).toBe(true);
  });

  test("a typical video is not a breakout", () => {
    const video = linear(260, [1, 4, 8]);
    expect(isBreakout(video, COHORT)).toBe(false);
  });

  test("null when there is no common age or the cohort is thin", () => {
    // Trackeado tan tarde (día 20+) que el cohorte ya no llega a esa edad.
    const late = [{ ageDays: 20, views: 5000 }];
    expect(benchmarkAgainstCohort(late, COHORT)).toBeNull();
    // Y con cohorte insuficiente tampoco hay comparación.
    const video = linear(600, [1, 4, 8]);
    expect(benchmarkAgainstCohort(video, COHORT.slice(0, 2))).toBeNull();
  });

  test("a snapshot landing exactly on an age counts as real data", () => {
    // Primer snapshot justo al día 6: es un valor observado, se compara ahí.
    const result = benchmarkAgainstCohort([{ ageDays: 6, views: 5000 }], COHORT);
    expect(result?.atAgeDays).toBe(6);
    expect(result?.medianViews).toBe(1500);
  });
});
