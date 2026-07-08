import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { env } from "@/core/config/env";
import {
  getGrowthSummary,
  getTopVideos,
  getVideoStats,
  searchVideos,
} from "@/modules/mcp/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Servidor MCP remoto (Streamable HTTP) en /api/mcp. Expone la analítica
 * persistida como tools de solo lectura para Claude (p. ej. cruzar guiones de
 * Obsidian con el rendimiento real de cada video).
 *
 * Auth: Bearer con `MCP_SECRET` (fail-closed). El middleware excluye `api/mcp`
 * de la sesión de usuario; esta capa es la única compuerta.
 */

const platformSchema = z.enum(["tiktok", "instagram"]);
const contentTypeSchema = z.enum(["audioviral", "dui", "duiyhal", "news"]);

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "search_videos",
      {
        title: "Buscar videos",
        description:
          "Busca videos por texto del caption (útil para encontrar el video de un guion). Devuelve metadatos y métricas actuales.",
        inputSchema: {
          query: z.string().min(1).describe("Texto a buscar dentro del caption"),
          platform: platformSchema.optional(),
          limit: z.number().int().min(1).max(50).optional(),
        },
      },
      async (args) => json(await searchVideos(args)),
    );

    server.registerTool(
      "get_video_stats",
      {
        title: "Estadísticas de un video",
        description:
          "Métricas completas de un video: actuales, vistas a N días (corte por edad, default 30), velocidad inicial, benchmark vs. lo típico de la plataforma e historial de snapshots.",
        inputSchema: {
          platform: platformSchema,
          externalId: z.string().min(1).describe("Id del video en la plataforma"),
          ageDays: z.number().int().min(1).max(180).optional(),
        },
      },
      async (args) => json(await getVideoStats(args)),
    );

    server.registerTool(
      "get_top_videos",
      {
        title: "Top de videos",
        description:
          "Ranking de videos por vistas o engagement, filtrable por tipo de contenido (audioviral/dui/duiyhal/news), plataforma y ventana de publicación.",
        inputSchema: {
          contentType: contentTypeSchema.optional(),
          platform: platformSchema.optional(),
          publishedWithinDays: z.number().int().min(1).optional(),
          orderBy: z.enum(["views", "engagement"]).optional(),
          limit: z.number().int().min(1).max(50).optional(),
        },
      },
      async (args) => json(await getTopVideos(args)),
    );

    server.registerTool(
      "get_growth_summary",
      {
        title: "Resumen de crecimiento",
        description:
          "Estado de las cuentas (seguidores), totales del catálogo, vistas ganadas por mes (momentum) y mejor día/hora para publicar.",
        inputSchema: {
          platform: platformSchema.optional(),
        },
      },
      async (args) => json(await getGrowthSummary(args)),
    );
  },
  {},
  { basePath: "/api", maxDuration: 60 },
);

/** Compuerta: Bearer MCP_SECRET, fail-closed si no está configurado. */
function withAuth(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    const secret = env("MCP_SECRET");
    if (!secret) {
      return new Response(
        JSON.stringify({ error: "MCP_SECRET no configurado" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return handler(req);
  };
}

const handler = withAuth(mcpHandler);
export { handler as GET, handler as POST, handler as DELETE };
