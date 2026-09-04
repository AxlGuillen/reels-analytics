import { describe, expect, test } from "bun:test";
import {
  formatMilestoneDate,
  TIMELINE,
  timelineStats,
} from "./timeline-data";

/**
 * Guardián de la línea de tiempo: los datos son editoriales pero tienen
 * contrato — fechas ISO en orden dentro de cada capítulo (y entre capítulos),
 * shas con forma de hash corto de git, y el chip lima reservado a pocos hitos
 * (jerarquía por tono: si todo es clave, nada lo es).
 */
describe("timeline-data", () => {
  const all = TIMELINE.flatMap((c) => c.milestones);

  test("hay capítulos y todos traen hitos", () => {
    expect(TIMELINE.length).toBeGreaterThan(0);
    for (const chapter of TIMELINE) {
      expect(chapter.milestones.length).toBeGreaterThan(0);
      expect(chapter.title).not.toBe("");
      expect(chapter.intro).not.toBe("");
    }
  });

  test("las fechas son ISO y avanzan en orden cronológico", () => {
    let prev = "";
    for (const m of all) {
      expect(m.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(m.date >= prev).toBe(true);
      prev = m.date;
    }
  });

  test("los shas tienen forma de hash corto de git", () => {
    for (const m of all) {
      if (m.sha) expect(m.sha).toMatch(/^[0-9a-f]{7,10}$/);
    }
    // Como mucho un hito sin sha: el que estrena la propia página.
    expect(all.filter((m) => !m.sha).length).toBeLessThanOrEqual(1);
  });

  test("el chip lima es escaso (jerarquía por tono)", () => {
    const tagged = all.filter((m) => m.tag).length;
    expect(tagged).toBeGreaterThan(0);
    expect(tagged).toBeLessThanOrEqual(Math.ceil(all.length / 3));
  });

  test("timelineStats deriva días e hitos de los propios datos", () => {
    const stats = timelineStats();
    expect(stats.milestones).toBe(all.length);
    expect(stats.firstDate).toBe("2026-07-02");
    expect(stats.days).toBeGreaterThan(30);
  });

  test("formatMilestoneDate no depende de zonas horarias", () => {
    expect(formatMilestoneDate("2026-07-02")).toBe("02 jul");
    expect(formatMilestoneDate("2026-12-31")).toBe("31 dic");
  });
});
