import { describe, expect, test } from "bun:test";
import { summarizeCaptures, type AccountCapture } from "./summary";

const account = (over: Partial<AccountCapture>): AccountCapture => ({
  platform: "tiktok",
  label: "@axelsine13",
  primary: true,
  ok: true,
  videos: 10,
  snapshots: 10,
  ...over,
});

const fulfilled = (value: AccountCapture[]): PromiseSettledResult<AccountCapture[]> => ({
  status: "fulfilled",
  value,
});
const rejected = (message: string): PromiseSettledResult<AccountCapture[]> => ({
  status: "rejected",
  reason: new Error(message),
});

describe("summarizeCaptures", () => {
  test("suma todas las cuentas de todas las plataformas", () => {
    const s = summarizeCaptures([
      {
        platform: "tiktok",
        result: fulfilled([
          account({ videos: 480, snapshots: 480 }),
          account({ label: "@axelsine", primary: false, videos: 12, snapshots: 12 }),
        ]),
      },
      {
        platform: "instagram",
        result: fulfilled([account({ platform: "instagram", videos: 30, snapshots: 80 })]),
      },
    ]);
    expect(s.videos).toBe(522);
    expect(s.snapshots).toBe(572);
    expect(s.failures).toEqual([]);
    expect(s.anySaved).toBe(true);
    expect(s.accounts).toHaveLength(3);
  });

  test("una secundaria caída no tapa que la principal guardó", () => {
    // El caso que motivó resumir por cuenta: "tiktok: ok" escondía la falla.
    const s = summarizeCaptures([
      {
        platform: "tiktok",
        result: fulfilled([
          account({ videos: 480, snapshots: 480 }),
          account({
            label: "@axelsine",
            primary: false,
            ok: false,
            videos: 0,
            snapshots: 0,
            error: "Sin token válido",
          }),
        ]),
      },
    ]);
    expect(s.anySaved).toBe(true);
    expect(s.videos).toBe(480);
    expect(s.failures).toEqual([
      { platform: "tiktok", label: "@axelsine", message: "Sin token válido" },
    ]);
  });

  test("un rechazo de plataforma se etiqueta con la plataforma", () => {
    // Sin conexión guardada no hay cuentas que nombrar.
    const s = summarizeCaptures([
      { platform: "tiktok", result: fulfilled([account({})]) },
      { platform: "instagram", result: rejected("Instagram sin token válido") },
    ]);
    expect(s.anySaved).toBe(true);
    expect(s.failures).toEqual([
      { platform: "instagram", label: "Instagram", message: "Instagram sin token válido" },
    ]);
  });

  test("si nada guardó, anySaved es false y no suma lo fallido", () => {
    const s = summarizeCaptures([
      {
        platform: "tiktok",
        result: fulfilled([account({ ok: false, videos: 99, snapshots: 99, error: "x" })]),
      },
      { platform: "instagram", result: rejected("y") },
    ]);
    expect(s.anySaved).toBe(false);
    expect(s.videos).toBe(0);
    expect(s.snapshots).toBe(0);
    expect(s.failures).toHaveLength(2);
  });
});
