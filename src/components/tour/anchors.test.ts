import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { TOURS } from "./steps";

/**
 * Guardián de anclas: el modo clásico en que un tour se pudre es que un
 * refactor borre (o renombre) el `data-tour` de una página y el paso quede
 * apuntando al vacío — degrada en silencio por diseño, así que nadie lo ve.
 * Este test escanea `src/` y cruza registro ↔ código en ambas direcciones,
 * igual que `theme-contrast.test.ts` hace con los tokens.
 */

const SRC_DIR = join(import.meta.dir, "..", "..");

/** data-tour="..." presentes en el código (excluye el propio registro del tour). */
function collectAnchors(dir: string, out = new Set<string>()): Set<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "tour") continue; // steps.ts contiene los targets
      collectAnchors(path, out);
    } else if (entry.name.endsWith(".tsx")) {
      for (const m of readFileSync(path, "utf8").matchAll(
        /data-tour="([a-z0-9-]+)"/g,
      )) {
        out.add(m[1]);
      }
    }
  }
  return out;
}

const anchors = collectAnchors(SRC_DIR);

/** Nombre del ancla dentro de un target `[data-tour="x"]`. */
const anchorOf = (target: string): string =>
  target.match(/^\[data-tour="([a-z0-9-]+)"\]$/)?.[1] ?? "";

describe("anclas de los tours", () => {
  test.each(Object.entries(TOURS))(
    "%s: cada target tiene su data-tour en el código",
    (_route, tour) => {
      for (const step of tour.steps) {
        const name = anchorOf(step.target);
        expect(
          anchors.has(name),
          `El paso "${step.title}" apunta a data-tour="${name}" y no existe en src/ — ¿un refactor lo borró?`,
        ).toBe(true);
      }
    },
  );

  test("cada data-tour del código tiene al menos un paso (sin anclas muertas)", () => {
    const referenced = new Set(
      Object.values(TOURS).flatMap((t) => t.steps.map((s) => anchorOf(s.target))),
    );
    for (const anchor of anchors) {
      expect(
        referenced.has(anchor),
        `data-tour="${anchor}" existe en el código pero ningún paso lo usa — bórralo o escribe su paso`,
      ).toBe(true);
    }
  });
});
