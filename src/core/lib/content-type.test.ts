import { describe, expect, test } from "bun:test";
import {
  classifyContentType,
  contentTypeTag,
  RESERVED_TAGS,
} from "./content-type";

describe("classifyContentType", () => {
  test("matcha el tag canónico", () => {
    expect(classifyContentType(["dui"])).toBe("dui");
    expect(classifyContentType(["news", "leagueoflegends"])).toBe("news");
    expect(classifyContentType(["cumpleañeros"])).toBe("cumpleaneros");
  });

  test("los alias cuentan como el mismo tipo (mundial / mundial2026)", () => {
    expect(classifyContentType(["mundial"])).toBe("mundial2026");
    expect(classifyContentType(["mundial2026"])).toBe("mundial2026");
  });

  test("las grafías históricas de cumpleaños caen en cumpleaneros", () => {
    for (const tag of ["cumplelolero", "cumpleañeros", "cumpleaños", "cumpleanos"]) {
      expect(classifyContentType([tag, "leagueoflegends"])).toBe("cumpleaneros");
    }
  });

  test("clasifica la sección de debate", () => {
    expect(classifyContentType(["debatelolero", "leagueoflegends"])).toBe(
      "debatelolero",
    );
  });

  test("respeta la precedencia (duiyhal antes que dui)", () => {
    expect(classifyContentType(["dui", "duiyhal"])).toBe("duiyhal");
  });

  test("clasifica la cobertura del SoloQ Challenge", () => {
    expect(classifyContentType(["soloqchallenge2026", "leagueoflegends"])).toBe(
      "soloqchallenge2026",
    );
  });

  test("el evento gana sobre el formato (dui/audioviral)", () => {
    expect(classifyContentType(["dui", "soloqchallenge2026"])).toBe(
      "soloqchallenge2026",
    );
    expect(classifyContentType(["audioviral", "soloqchallenge2026"])).toBe(
      "soloqchallenge2026",
    );
  });

  test("clasifica Worlds, Lore lol y Relato lolero (sep 2026)", () => {
    expect(classifyContentType(["worlds2026", "leagueoflegends"])).toBe("worlds2026");
    expect(classifyContentType(["lorelol"])).toBe("lorelol");
    expect(classifyContentType(["relatolero", "humor"])).toBe("relatolero");
  });

  test("Worlds es evento: gana a los formatos como el SoloQ Challenge", () => {
    expect(classifyContentType(["relatolero", "worlds2026"])).toBe("worlds2026");
    expect(classifyContentType(["dui", "worlds2026"])).toBe("worlds2026");
  });

  test("devuelve null sin ningún tag de tipo (temáticos no clasifican)", () => {
    expect(classifyContentType(["humor", "leagueoflegends", "axelsine"])).toBeNull();
    expect(classifyContentType([])).toBeNull();
  });
});

describe("RESERVED_TAGS", () => {
  test("incluye canónicos y alias, no los temáticos", () => {
    for (const t of [
      "dui",
      "news",
      "mundial",
      "mundial2026",
      "cumpleañeros",
      "cumplelolero",
      "cumpleaños",
      "soloqchallenge2026",
      "debatelolero",
      "worlds2026",
      "lorelol",
      "relatolero",
    ]) {
      expect(RESERVED_TAGS.has(t)).toBe(true);
    }
    expect(RESERVED_TAGS.has("humor")).toBe(false);
    expect(RESERVED_TAGS.has("leagueoflegends")).toBe(false);
  });
});

describe("contentTypeTag", () => {
  test("devuelve el hashtag canónico (primer alias)", () => {
    expect(contentTypeTag("mundial2026")).toBe("mundial2026");
    expect(contentTypeTag("dui")).toBe("dui");
  });
});
