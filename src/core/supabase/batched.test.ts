import { describe, expect, test } from "bun:test";
import { fetchAllPages, fetchByIds, ID_CHUNK, PAGE_SIZE } from "./batched";

/** Fuente falsa: `total` filas numeradas, servidas por rango como PostgREST. */
function source(total: number) {
  const calls: { chunk?: string[]; from: number; to: number }[] = [];
  const rows = Array.from({ length: total }, (_, i) => i);
  const page = (from: number, to: number, chunk?: string[]) => {
    calls.push({ chunk, from, to });
    return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
  };
  return { calls, page };
}

describe("fetchAllPages", () => {
  test("sigue pidiendo páginas mientras vengan llenas", async () => {
    const { calls, page } = source(PAGE_SIZE * 2 + 5);
    const rows = await fetchAllPages("t", (from, to) => page(from, to));
    expect(rows).toHaveLength(PAGE_SIZE * 2 + 5);
    expect(calls.map((c) => c.from)).toEqual([0, PAGE_SIZE, PAGE_SIZE * 2]);
  });

  test("una página exacta pide una más y corta en la vacía", async () => {
    const { calls, page } = source(PAGE_SIZE);
    expect(await fetchAllPages("t", (f, t) => page(f, t))).toHaveLength(PAGE_SIZE);
    expect(calls).toHaveLength(2);
  });

  test("propaga el error con su etiqueta (nunca lo traga)", async () => {
    const failing = () =>
      Promise.resolve({ data: null, error: { message: "Bad Request" } });
    expect(fetchAllPages("ra_video_snapshots", failing)).rejects.toThrow(
      "ra_video_snapshots: Bad Request",
    );
  });
});

describe("fetchByIds", () => {
  test("parte los ids en lotes de ID_CHUNK sin perder ninguno", async () => {
    const ids = Array.from({ length: ID_CHUNK * 4 + 26 }, (_, i) => `id-${i}`);
    const seen: string[][] = [];
    await fetchByIds("t", ids, (chunk) => {
      seen.push(chunk);
      return Promise.resolve({ data: [], error: null });
    });
    expect(seen).toHaveLength(5);
    expect(seen.every((c) => c.length <= ID_CHUNK)).toBe(true);
    expect(seen.flat()).toEqual(ids);
  });

  test("pagina dentro de cada lote", async () => {
    const { calls, page } = source(PAGE_SIZE + 1);
    const ids = Array.from({ length: ID_CHUNK + 1 }, (_, i) => `id-${i}`);
    const rows = await fetchByIds("t", ids, (chunk, from, to) =>
      page(from, to, chunk),
    );
    // 2 lotes × (página llena + resto) = 4 requests.
    expect(calls).toHaveLength(4);
    expect(rows).toHaveLength((PAGE_SIZE + 1) * 2);
  });

  test("sin ids no hace requests", async () => {
    let n = 0;
    await fetchByIds("t", [], () => {
      n++;
      return Promise.resolve({ data: [], error: null });
    });
    expect(n).toBe(0);
  });
});
