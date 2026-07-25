import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { env } from "@/core/config/env";
import { PROTECTED_RESOURCE_PATH, SCOPE, appUrl } from "@/modules/oauth/config";
import { lookupAccessToken } from "@/modules/oauth/store";
import { safeEqual } from "@/modules/oauth/tokens";
import {
  comparePlatforms,
  getActivityTimeline,
  getBreakouts,
  getGrowthSummary,
  getHashtagStats,
  getScriptStatsBlock,
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
      "get_activity_timeline",
      {
        title: "Actividad por periodo",
        description:
          "Serie por día/semana/mes: videos publicados, vistas/likes/comentarios/compartidos GANADOS en el periodo (deltas de snapshots) y seguidores ganados. Filtrable por plataforma. Solo cubre desde el inicio de la ingesta.",
        inputSchema: {
          granularity: z.enum(["day", "week", "month"]).optional(),
          platform: platformSchema.optional(),
          sinceDays: z.number().int().min(1).max(730).optional(),
        },
      },
      async (args) => json(await getActivityTimeline(args)),
    );

    server.registerTool(
      "get_hashtag_stats",
      {
        title: "Estadísticas de un hashtag",
        description:
          "Rendimiento agregado de CUALQUIER hashtag (#news, #humor, ...): cuántos videos lo llevan, vistas totales/promedio, engagement ponderado, totales de interacción y su top de videos.",
        inputSchema: {
          hashtag: z.string().min(1).describe("El hashtag, con o sin #"),
          platform: platformSchema.optional(),
          publishedWithinDays: z.number().int().min(1).optional(),
          topN: z.number().int().min(1).max(20).optional(),
        },
      },
      async (args) => json(await getHashtagStats(args)),
    );

    server.registerTool(
      "compare_platforms",
      {
        title: "Comparar plataformas",
        description:
          "TikTok vs Instagram lado a lado en la misma ventana: seguidores y su delta, videos publicados, vistas ganadas por el catálogo y engagement de lo publicado.",
        inputSchema: {
          sinceDays: z.number().int().min(1).max(365).optional(),
        },
      },
      async (args) => json(await comparePlatforms(args)),
    );

    server.registerTool(
      "get_breakouts",
      {
        title: "Videos despegando ahora",
        description:
          "Videos que van a ≥2× la mediana de su plataforma a su misma edad, con su múltiplo. Vacío si el cohorte con historia temprana aún es chico.",
        inputSchema: {
          platform: platformSchema.optional(),
        },
      },
      async (args) => json(await getBreakouts(args)),
    );

    server.registerTool(
      "get_script_stats_block",
      {
        title: "Bloque de stats para un guion",
        description:
          "Busca el video de un guion en AMBAS plataformas por el texto/código del caption y devuelve un bloque YAML listo para pegar en el frontmatter de la nota de Obsidian (con corte por edad, default 30 días).",
        inputSchema: {
          query: z
            .string()
            .min(1)
            .describe("El código/texto del caption que identifica al guion"),
          ageDays: z.number().int().min(1).max(180).optional(),
        },
      },
      async (args) => ({
        content: [{ type: "text" as const, text: await getScriptStatsBlock(args) }],
      }),
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

/**
 * Compuerta del resource server. Acepta dos credenciales:
 *  1. Un access token OAuth 2.1 emitido por nosotros (ver `modules/oauth`), con
 *     audience ligada a este MCP — es el camino de los conectores remotos.
 *  2. El `MCP_SECRET` estático (legacy) que ya usa el cliente de Claude Code.
 *
 * Devolver `undefined` hace que `withMcpAuth` responda 401 **con el header
 * `WWW-Authenticate`** apuntando al Protected Resource Metadata: sin eso, un
 * cliente MCP no puede descubrir el authorization server.
 */
async function verifyToken(_req: Request, bearerToken?: string) {
  if (!bearerToken) return undefined;

  const secret = env("MCP_SECRET");
  if (secret && safeEqual(bearerToken, secret)) {
    return {
      token: bearerToken,
      clientId: "claude-code-legacy",
      scopes: [SCOPE],
    };
  }

  const context = await lookupAccessToken(bearerToken);
  if (!context) return undefined;

  return {
    token: bearerToken,
    clientId: context.clientId,
    scopes: context.scope.split(" ").filter(Boolean),
    expiresAt: Math.floor(context.expiresAt.getTime() / 1000),
    resource: new URL(context.resource),
    extra: { userId: context.userId },
  };
}

const handler = withMcpAuth(mcpHandler, verifyToken, {
  required: true,
  requiredScopes: [SCOPE],
  resourceMetadataPath: PROTECTED_RESOURCE_PATH,
  // `resourceUrl` aquí es solo el ORIGEN con el que se arma la URL del metadata
  // (no el identificador del recurso): con la URI canónica saldría
  // `/api/mcp/.well-known/...`, que no existe. La audiencia se valida abajo.
  resourceUrl: appUrl(),
});

export { handler as GET, handler as POST, handler as DELETE };
