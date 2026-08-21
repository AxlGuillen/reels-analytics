import { describe, expect, test } from "bun:test";
import { TOURS } from "./steps";

/**
 * Guardián del registro de tours. La validación fuerte (que cada target tenga
 * su `data-tour` en el código de la página) llega en la fase del test de
 * anclas; esto fija la forma y las reglas editoriales.
 */
describe("registro de tours", () => {
  const entries = Object.entries(TOURS);

  test("hay al menos un tour registrado", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  test.each(entries)("%s: targets con convención data-tour y únicos", (_route, tour) => {
    const targets = tour.steps.map((s) => s.target);
    for (const t of targets) {
      expect(t).toMatch(/^\[data-tour="[a-z0-9-]+"\]$/);
    }
    expect(new Set(targets).size).toBe(targets.length);
  });

  test.each(entries)("%s: máximo 6 pasos y copy no vacío", (_route, tour) => {
    expect(tour.steps.length).toBeGreaterThan(0);
    expect(tour.steps.length).toBeLessThanOrEqual(6);
    for (const s of tour.steps) {
      expect(s.title.trim().length).toBeGreaterThan(0);
      // Descripción sustanciosa pero no un ensayo (cabe en el popover).
      expect(s.description.trim().length).toBeGreaterThanOrEqual(40);
      expect(s.description.length).toBeLessThanOrEqual(220);
    }
  });

  test.each(entries)("%s: versión entera positiva", (_route, tour) => {
    expect(Number.isInteger(tour.version)).toBe(true);
    expect(tour.version).toBeGreaterThanOrEqual(1);
  });
});
