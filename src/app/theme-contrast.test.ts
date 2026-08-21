import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guardián de contraste del tema: parsea los tokens de `globals.css` y falla si
 * un par crítico baja de AA (4.5:1 texto, 3:1 foco). Así "soportar dark sin
 * perder contrastes" no es una promesa sino un test: cualquier cambio de paleta
 * que rompa la legibilidad revienta `bun test` antes de llegar a un PR.
 */

const css = readFileSync(join(import.meta.dir, "globals.css"), "utf8");

/** Extrae los tokens hex (`--x: #rrggbb;`) de un bloque `:root` / `.dark`. */
function tokensOf(selector: string): Record<string, string> {
  const match = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`, "s"));
  if (!match) throw new Error(`No se encontró el bloque ${selector}`);
  const tokens: Record<string, string> = {};
  for (const m of match[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

/** Luminancia relativa WCAG de un hex. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG entre dos hex. */
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Pares texto-sobre-fondo que deben cumplir AA (4.5:1) en ambos temas. */
const TEXT_PAIRS: [text: string, surface: string][] = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "background"],
  // La regla central del sistema: el lima es superficie con tinta encima.
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  // `text-destructive` se usa como texto sobre card (mensajes de error).
  ["destructive", "card"],
  ["success-foreground", "success"],
  ["sidebar-foreground", "sidebar"],
];

for (const theme of [":root", ".dark"] as const) {
  describe(`contraste ${theme === ":root" ? "claro" : "oscuro"}`, () => {
    const t = tokensOf(theme);

    test.each(TEXT_PAIRS)("%s sobre %s ≥ 4.5:1", (text, surface) => {
      expect(t[text]).toBeDefined();
      expect(t[surface]).toBeDefined();
      expect(ratio(t[text], t[surface])).toBeGreaterThanOrEqual(4.5);
    });

    test("anillo de foco visible (ring vs background ≥ 3:1)", () => {
      expect(ratio(t["ring"], t["background"])).toBeGreaterThanOrEqual(3);
    });
  });
}

describe("separación de planos en oscuro", () => {
  // En oscuro card vs fondo ronda 1.2:1 (la sombra negra no separa), así que el
  // límite lo dibuja un anillo luminoso de 1px como PRIMERA capa de cada
  // elevación. Este test fija ese mecanismo para que no se pierda en un refactor.
  const dark = css.match(/\.dark\s*\{([^}]*)\}/s)?.[1] ?? "";

  test.each(["elev-card", "elev-lift", "elev-rail"])(
    "--%s empieza con el anillo luminoso",
    (token) => {
      const value = dark.match(new RegExp(`--${token}:\\s*([^;]+);`, "s"))?.[1];
      expect(value).toBeDefined();
      expect(value!.trim()).toMatch(/^0 0 0 1px rgb\(255 255 255/);
    },
  );
});

describe("superficies hundidas en oscuro", () => {
  // En claro lo hundido se lee por el contexto de sombras; en oscuro la sombra
  // no existe y con 1.10:1 los inputs/tiles/tracks desaparecían. Este piso
  // (1.3:1 vs card) evita la regresión. Solo aplica a oscuro a propósito.
  const t = tokensOf(".dark");

  test.each([["muted"], ["secondary"], ["accent"]])(
    "%s vs card ≥ 1.3:1",
    (token) => {
      expect(ratio(t[token], t["card"])).toBeGreaterThanOrEqual(1.3);
    },
  );
});
