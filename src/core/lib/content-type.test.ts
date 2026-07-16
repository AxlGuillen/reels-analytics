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

  test("respeta la precedencia (duiyhal antes que dui)", () => {
    expect(classifyContentType(["dui", "duiyhal"])).toBe("duiyhal");
  });

  test("devuelve null sin ningún tag de tipo (temáticos no clasifican)", () => {
    expect(classifyContentType(["humor", "leagueoflegends", "axelsine"])).toBeNull();
    expect(classifyContentType([])).toBeNull();
  });
});

describe("RESERVED_TAGS", () => {
  test("incluye canónicos y alias, no los temáticos", () => {
    for (const t of ["dui", "news", "mundial", "mundial2026", "cumpleañeros"]) {
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
