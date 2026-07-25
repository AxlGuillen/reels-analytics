/**
 * Catálogo de las tools del servidor MCP: nombre, título y descripción.
 *
 * Fuente única de verdad para los dos consumidores: el `registerTool` del route
 * handler y la página `/settings/mcp` que las lista. Los esquemas de entrada
 * (zod) siguen viviendo junto a cada `registerTool` — aquí solo el texto, que es
 * lo que se duplicaría y acabaría desincronizado.
 */

export interface McpToolInfo {
  name: string;
  title: string;
  description: string;
}

export const MCP_TOOLS = [
  {
    name: "search_videos",
    title: "Buscar videos",
    description:
      "Busca videos por texto del caption (útil para encontrar el video de un guion). Devuelve metadatos y métricas actuales.",
  },
  {
    name: "get_video_stats",
    title: "Estadísticas de un video",
    description:
      "Métricas completas de un video: actuales, vistas a N días (corte por edad, default 30), velocidad inicial, benchmark vs. lo típico de la plataforma e historial de snapshots.",
  },
  {
    name: "get_top_videos",
    title: "Top de videos",
    description:
      "Ranking de videos por vistas o engagement, filtrable por tipo de contenido (audioviral/dui/duiyhal/news), plataforma y ventana de publicación.",
  },
  {
    name: "get_activity_timeline",
    title: "Actividad por periodo",
    description:
      "Serie por día/semana/mes: videos publicados, vistas/likes/comentarios/compartidos GANADOS en el periodo (deltas de snapshots) y seguidores ganados. Filtrable por plataforma. Solo cubre desde el inicio de la ingesta.",
  },
  {
    name: "get_hashtag_stats",
    title: "Estadísticas de un hashtag",
    description:
      "Rendimiento agregado de CUALQUIER hashtag (#news, #humor, ...): cuántos videos lo llevan, vistas totales/promedio, engagement ponderado, totales de interacción y su top de videos.",
  },
  {
    name: "compare_platforms",
    title: "Comparar plataformas",
    description:
      "TikTok vs Instagram lado a lado en la misma ventana: seguidores y su delta, videos publicados, vistas ganadas por el catálogo y engagement de lo publicado.",
  },
  {
    name: "get_breakouts",
    title: "Videos despegando ahora",
    description:
      "Videos que van a ≥2× la mediana de su plataforma a su misma edad, con su múltiplo. Vacío si el cohorte con historia temprana aún es chico.",
  },
  {
    name: "get_script_stats_block",
    title: "Bloque de stats para un guion",
    description:
      "Busca el video de un guion en AMBAS plataformas por el texto/código del caption y devuelve un bloque YAML listo para pegar en el frontmatter de la nota de Obsidian (con corte por edad, default 30 días).",
  },
  {
    name: "get_growth_summary",
    title: "Resumen de crecimiento",
    description:
      "Estado de las cuentas (seguidores), totales del catálogo, vistas ganadas por mes (momentum) y mejor día/hora para publicar.",
  },
] as const satisfies readonly McpToolInfo[];

export type McpToolName = (typeof MCP_TOOLS)[number]["name"];

/** Metadata por nombre, para pasarla a `registerTool` sin repetir los textos. */
export const TOOL_META = Object.fromEntries(
  MCP_TOOLS.map((tool) => [
    tool.name,
    { title: tool.title, description: tool.description },
  ]),
) as Record<McpToolName, { title: string; description: string }>;
