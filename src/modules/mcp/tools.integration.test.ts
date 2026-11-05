import { beforeAll, describe, expect, mock, test } from "bun:test";

/**
 * Pruebas de integración de las 9 tools del MCP contra la BD REAL.
 *
 * Por qué contra datos reales: el fallo que motivó este archivo no era de
 * lógica sino de FORMA de la consulta — un filtro `.in()` con el catálogo
 * completo generaba una URL que el gateway de Supabase rechazaba con 400. Con
 * datos de prueba (pocos ids) nunca se habría reproducido. Por eso cada tool
 * se ejecuta de verdad y se exige que (a) no lance y (b) no devuelva vacío
 * cuando sabemos que sí hay videos: un catálogo vacío fue justo la forma en
 * que `get_top_videos` ocultó el error durante semanas.
 *
 * Necesita credenciales (bun carga `.env` solo). Sin ellas se salta entera,
 * para que CI —que no tiene secretos— siga en verde.
 */

const hasCreds =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SECRET_KEY;

// `server-only` aborta fuera del runtime de React Server Components; aquí
// corremos los mismos módulos en bun, así que se neutraliza antes de importar.
mock.module("server-only", () => ({}));

/** Leen el catálogo completo contra la BD real: muy por encima de los 5 s de bun. */
const TIMEOUT = 120_000;

type Tools = typeof import("./tools");
let tools: Tools;

beforeAll(async () => {
  if (!hasCreds) return;
  tools = await import("./tools");
});

describe.skipIf(!hasCreds)("MCP tools contra datos reales", () => {
  test(
    "compare_platforms devuelve ambas plataformas con videos",
    async () => {
      const res = await tools.comparePlatforms({ sinceDays: 30 });
      expect(res.platforms).toHaveLength(2);
      // Referencia del resto: si esto da 0, el problema son los datos.
      const published = res.platforms.reduce((n, p) => n + p.videosPublished, 0);
      expect(published).toBeGreaterThan(0);
    },
    TIMEOUT,
  );

  test(
    "get_top_videos NO devuelve vacío sin filtro de plataforma",
    async () => {
      // El caso exacto de la regresión: sin plataforma entran los ~822 ids del
      // catálogo y la consulta se pasaba del largo de URL.
      const res = await tools.getTopVideos({ publishedWithinDays: 30 });
      expect(res.total).toBeGreaterThan(0);
      expect(res.videos.length).toBeGreaterThan(0);
    },
    TIMEOUT,
  );

  test(
    "get_top_videos responde igual filtrado por plataforma",
    async () => {
      for (const platform of ["tiktok", "instagram"] as const) {
        const res = await tools.getTopVideos({
          platform,
          publishedWithinDays: 30,
        });
        expect(res.total).toBeGreaterThan(0);
      }
    },
    TIMEOUT,
  );

  test(
    "get_growth_summary trae catálogo y cuentas, con y sin plataforma",
    async () => {
      const all = await tools.getGrowthSummary();
      expect(all.accounts.length).toBeGreaterThan(0);
      expect(all.catalog.totalVideos).toBeGreaterThan(0);

      const tiktok = await tools.getGrowthSummary({ platform: "tiktok" });
      expect(tiktok.catalog.totalVideos).toBeGreaterThan(0);
    },
    TIMEOUT,
  );

  test(
    "get_activity_timeline devuelve buckets con y sin plataforma",
    async () => {
      const day = await tools.getActivityTimeline({
        granularity: "day",
        sinceDays: 14,
      });
      expect(day.buckets.length).toBeGreaterThan(0);

      const month = await tools.getActivityTimeline({
        granularity: "month",
        platform: "instagram",
      });
      expect(month.buckets.length).toBeGreaterThan(0);
    },
    TIMEOUT,
  );

  test(
    "get_hashtag_stats resume un hashtag del catálogo",
    async () => {
      const res = await tools.getHashtagStats({ hashtag: "leagueoflegends" });
      // `videoCount` es el único campo de ambas ramas del return (la rama
      // "ningún video" no trae totales ni topVideos).
      expect(res.videoCount).toBeGreaterThan(0);
    },
    TIMEOUT,
  );

  test(
    "search_videos encuentra por caption",
    async () => {
      // "lol" aparece en el caption de prácticamente todo el catálogo.
      const res = await tools.searchVideos({ query: "lol", limit: 5 });
      expect(res.total).toBeGreaterThan(0);
      expect(res.videos.length).toBeGreaterThan(0);
    },
    TIMEOUT,
  );

  test(
    "get_video_stats resuelve un video real del catálogo",
    async () => {
      const top = await tools.getTopVideos({ limit: 1 });
      const first = top.videos[0];
      expect(first).toBeDefined();

      const stats = await tools.getVideoStats({
        platform: first!.platform,
        externalId: first!.externalId,
      });
      expect(stats.metrics.views).toBeGreaterThan(0);
      expect(stats.history.length).toBeGreaterThan(0);
    },
    TIMEOUT,
  );

  test(
    "get_breakouts corre sin error (puede venir vacío por diseño)",
    async () => {
      // Vacío es un resultado LEGÍTIMO aquí: si el cohorte con historia
      // temprana es chico, la tool no devuelve nada a propósito. Solo
      // exigimos que no truene.
      const res = await tools.getBreakouts({});
      expect(Array.isArray(res.breakouts)).toBe(true);
    },
    TIMEOUT,
  );

  test(
    "get_script_stats_block devuelve el bloque del guion",
    async () => {
      const top = await tools.getTopVideos({ limit: 1 });
      const caption = top.videos[0]?.caption ?? "";
      // Primeras palabras del caption: suficiente para que haga match.
      const needle = caption.split(" ").slice(0, 3).join(" ");
      const block = await tools.getScriptStatsBlock({ query: needle });
      expect(block).not.toContain("No encontré");
      expect(block.length).toBeGreaterThan(0);
    },
    TIMEOUT,
  );
});
