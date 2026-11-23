import { describe, expect, test } from "bun:test";
import { weekOverWeek } from "./account-week";

describe("weekOverWeek", () => {
  test("variación relativa contra la semana anterior", () => {
    expect(weekOverWeek(135, 100)).toBeCloseTo(0.35);
    expect(weekOverWeek(50, 100)).toBeCloseTo(-0.5);
  });

  test("sin base no hay porcentaje", () => {
    // Cuenta nueva o semana sin capturas: "+∞ %" no le sirve a nadie.
    expect(weekOverWeek(120, 0)).toBeNull();
  });
});
