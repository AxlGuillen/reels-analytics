import { describe, expect, test } from "bun:test";
import { resolvePeriod, sumOverPeriod } from "./period";

// 2026-07-13 = lunes, 07-14 martes, 07-15 miércoles (referencia del proyecto).
const TODAY = "2026-07-15";

describe("resolvePeriod — semana", () => {
  test("ancla al lunes y expande 7 días", () => {
    const p = resolvePeriod("week", "2026-07-15", TODAY);
    expect(p.key).toBe("2026-07-13");
    expect(p.dayKeys).toEqual([
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
      "2026-07-19",
    ]);
    expect(p.sub.granularity).toBe("day");
    expect(p.sub.buckets).toHaveLength(7);
    expect(p.sub.buckets[0].label).toBe("Lun");
  });

  test("sin anchor usa la semana de hoy", () => {
    expect(resolvePeriod("week", undefined, TODAY).key).toBe("2026-07-13");
  });

  test("no deja navegar a una semana futura", () => {
    const p = resolvePeriod("week", "2026-07-15", TODAY);
    expect(p.prevAnchor).toBe("2026-07-06");
    expect(p.nextAnchor).toBeNull();
  });

  test("una semana pasada sí tiene siguiente", () => {
    const p = resolvePeriod("week", "2026-07-06", TODAY);
    expect(p.nextAnchor).toBe("2026-07-13");
  });
});

describe("resolvePeriod — mes", () => {
  test("expande el mes completo y agrupa por semanas", () => {
    const p = resolvePeriod("month", "2026-07-15", TODAY);
    expect(p.key).toBe("2026-07");
    expect(p.dayKeys).toHaveLength(31);
    expect(p.dayKeys[0]).toBe("2026-07-01");
    expect(p.dayKeys[30]).toBe("2026-07-31");
    expect(p.sub.granularity).toBe("week");
    // los sub-buckets cubren exactamente todos los días del mes, sin huecos.
    expect(p.sub.buckets.flatMap((b) => b.dayKeys)).toEqual(p.dayKeys);
  });

  test("navegación de mes respeta el presente", () => {
    const actual = resolvePeriod("month", "2026-07-15", TODAY);
    expect(actual.prevAnchor).toBe("2026-06-01");
    expect(actual.nextAnchor).toBeNull();

    const past = resolvePeriod("month", "2026-06-10", TODAY);
    expect(past.nextAnchor).toBe("2026-07-01");
  });
});

describe("sumOverPeriod", () => {
  test("suma por día en total y por sub-bucket", () => {
    const p = resolvePeriod("week", "2026-07-15", TODAY);
    const map = new Map([
      ["2026-07-13", 10],
      ["2026-07-14", 5],
      ["2026-07-19", 2],
      ["2025-01-01", 999], // fuera del periodo, se ignora
    ]);
    const { total, perBucket } = sumOverPeriod(p, map);
    expect(total).toBe(17);
    expect(perBucket).toEqual([10, 5, 0, 0, 0, 0, 2]);
  });
});
