import { describe, expect, test } from "bun:test";
import crypto from "node:crypto";
import {
  hashToken,
  isValidRedirectUri,
  randomToken,
  redirectUriMatches,
  safeEqual,
  verifyPkceS256,
} from "./tokens";

/** Challenge S256 tal como lo calcularía un cliente OAuth a partir del verifier. */
function challengeFor(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

describe("randomToken / hashToken", () => {
  test("genera valores distintos y seguros para URL", () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test("el hash es determinista y distinto por token", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  test("el hash no revela el token", () => {
    expect(hashToken("secreto")).not.toContain("secreto");
  });
});

describe("safeEqual", () => {
  test("compara por contenido y tolera longitudes distintas", () => {
    expect(safeEqual("igual", "igual")).toBe(true);
    expect(safeEqual("igual", "distinto")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("verifyPkceS256", () => {
  test("acepta el par verifier/challenge correcto", () => {
    const verifier = randomToken(32);
    expect(verifyPkceS256(verifier, challengeFor(verifier))).toBe(true);
  });

  test("rechaza un verifier que no corresponde", () => {
    const challenge = challengeFor(randomToken(32));
    expect(verifyPkceS256(randomToken(32), challenge)).toBe(false);
  });

  test("rechaza valores vacíos", () => {
    const verifier = randomToken(32);
    expect(verifyPkceS256("", challengeFor(verifier))).toBe(false);
    expect(verifyPkceS256(verifier, "")).toBe(false);
  });

  test("rechaza `plain` (challenge igual al verifier)", () => {
    const verifier = randomToken(32);
    expect(verifyPkceS256(verifier, verifier)).toBe(false);
  });
});

describe("isValidRedirectUri", () => {
  test("acepta HTTPS y loopback en HTTP", () => {
    expect(isValidRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(isValidRedirectUri("http://localhost:3000/callback")).toBe(true);
    expect(isValidRedirectUri("http://127.0.0.1:8080/cb")).toBe(true);
  });

  test("rechaza HTTP fuera de loopback", () => {
    expect(isValidRedirectUri("http://evil.example.com/cb")).toBe(false);
  });

  test("rechaza fragmentos, esquemas raros y basura", () => {
    expect(isValidRedirectUri("https://ok.example.com/cb#frag")).toBe(false);
    expect(isValidRedirectUri("javascript:alert(1)")).toBe(false);
    expect(isValidRedirectUri("no-es-una-url")).toBe(false);
  });
});

describe("redirectUriMatches", () => {
  const registered = ["https://claude.ai/callback", "http://localhost:3000/cb"];

  test("exige coincidencia exacta", () => {
    expect(redirectUriMatches(registered, "https://claude.ai/callback")).toBe(true);
    expect(redirectUriMatches(registered, "http://localhost:3000/cb")).toBe(true);
  });

  test("no acepta prefijos ni variantes (evita open redirect)", () => {
    expect(redirectUriMatches(registered, "https://claude.ai/callback/evil")).toBe(
      false,
    );
    expect(redirectUriMatches(registered, "https://claude.ai/callback?x=1")).toBe(
      false,
    );
    expect(redirectUriMatches(registered, "https://evil.com/callback")).toBe(false);
    expect(redirectUriMatches([], "https://claude.ai/callback")).toBe(false);
  });
});
