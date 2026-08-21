/**
 * Registro de tours guiados por ruta — datos PUROS (testeable con bun test).
 *
 * Cada paso ancla a un `[data-tour="..."]` puesto en la página. Reglas
 * editoriales: máximo 6 pasos por pantalla, y cada descripción dice PARA QUÉ
 * sirve lo señalado, no qué es. `version` permite re-mostrar un tour cuando la
 * pantalla cambie fuerte (sube la versión → se resetea el "ya visto").
 *
 * `PageTour` filtra en runtime los pasos cuyo ancla no exista en el DOM (hay
 * elementos condicionales: "Mejor video" sin videos, estados desconectados...),
 * así que un paso ausente degrada en silencio, nunca truena.
 */

export interface TourStep {
  /** selector del ancla; por convención siempre `[data-tour="..."]`. */
  target: string;
  title: string;
  description: string;
}

export interface Tour {
  /** subir la versión re-muestra el tour a quien ya lo había visto. */
  version: number;
  steps: TourStep[];
}

export const TOURS: Record<string, Tour> = {
  "/": {
    version: 1,
    steps: [
      {
        target: '[data-tour="periodo"]',
        title: "Tu resumen por periodo",
        description:
          "Cambia entre semana y mes, y navega periodos anteriores con las flechas. Todo lo que ves abajo se recalcula para el periodo elegido.",
      },
      {
        target: '[data-tour="kpis"]',
        title: "Lo que ganaste en el periodo",
        description:
          "Vistas con su reparto por plataforma, seguidores nuevos y el mejor video. La card en lima es la métrica destacada; la oscura, tu hit.",
      },
      {
        target: '[data-tour="chart"]',
        title: "Vistas día a día",
        description:
          "Cada cápsula apila TikTok (tinta) e Instagram (lima). El día punteado es el líder del periodo — útil para ver qué día despegó.",
      },
      {
        target: '[data-tour="tipos"]',
        title: "Qué formato está rindiendo",
        description:
          "Tus vistas repartidas por tipo de contenido (según el hashtag identificador). Toca una barra para abrir el detalle de ese formato.",
      },
      {
        target: '[data-tour="plataformas"]',
        title: "Entra al detalle",
        description:
          "Accesos directos al panel de cada plataforma y al catálogo del periodo, con la interacción (likes y comentarios) de un vistazo.",
      },
    ],
  },

  "/growth": {
    version: 1,
    steps: [
      {
        target: '[data-tour="growth-filtros"]',
        title: "Filtra y normaliza",
        description:
          "Filtra por plataforma y cambia entre vistas totales o a 7 días — la comparación justa que no favorece a los videos viejos.",
      },
      {
        target: '[data-tour="growth-seguidores"]',
        title: "Seguidores en el tiempo",
        description:
          "La curva por plataforma desde que arrancó la ingesta. Los saltos suelen coincidir con tus hits — abajo puedes rastrear cuáles.",
      },
      {
        target: '[data-tour="growth-tipos"]',
        title: "Qué formato rinde",
        description:
          "Rendimiento por tipo de contenido según su hashtag identificador. Cada fila enlaza al catálogo de ese formato.",
      },
      {
        target: '[data-tour="growth-meses"]',
        title: "Tu historia por mes",
        description:
          "Videos, vistas y engagement por mes de publicación — para tendencias largas, sin el ruido del día a día.",
      },
      {
        target: '[data-tour="growth-duracion"]',
        title: "El efecto de la duración",
        description:
          "Vistas promedio por bucket de duración (solo TikTok la expone). Aquí vive la señal de que lo largo rinde más.",
      },
    ],
  },
  "/content": {
    version: 1,
    steps: [
      {
        target: '[data-tour="content-header"]',
        title: "Catálogo por tipo",
        description:
          "Tu contenido agrupado por el hashtag identificador de cada formato, con filtro por plataforma en la esquina.",
      },
      {
        target: '[data-tour="content-catalogo"]',
        title: "Una card por formato",
        description:
          "La card en lima es el formato que mejor rinde por vistas promedio. Toca cualquiera para abrir su detalle con KPIs y listado.",
      },
      {
        target: '[data-tour="content-drilldown"]',
        title: "KPIs del formato",
        description:
          "El resumen del grupo: videos, vistas totales y promedio, y engagement. Abajo, cada video con su métrica vigente.",
      },
    ],
  },
  "/tiktok": {
    version: 1,
    steps: [
      {
        target: '[data-tour="rango"]',
        title: "Elige el periodo",
        description:
          "Las gráficas y la tabla se acotan al rango elegido — útil para comparar la racha reciente contra tu histórico.",
      },
      {
        target: '[data-tour="panel-perfil"]',
        title: "Tu cuenta de un vistazo",
        description:
          "Los números de la cuenta con sus stats derivadas: la card en lima destaca la métrica clave y la oscura, tu mejor día.",
      },
      {
        target: '[data-tour="panel-insights"]',
        title: "Cuándo rinde tu contenido",
        description:
          "Promedios por día de publicación y tus hashtags top. Son patrones del periodo elegido, no verdades eternas.",
      },
      {
        target: '[data-tour="panel-videos"]',
        title: "Cada video, su detalle",
        description:
          "La tabla del periodo con métricas y badge de breakout. Toca una fila para abrir la curva de crecimiento del video.",
      },
    ],
  },
  "/instagram": {
    version: 1,
    steps: [
      {
        target: '[data-tour="rango"]',
        title: "Elige el periodo",
        description:
          "Acota los Reels y las gráficas al rango elegido. El histórico por Reel sale de los snapshots diarios de la ingesta.",
      },
      {
        target: '[data-tour="panel-perfil"]',
        title: "Tu cuenta de un vistazo",
        description:
          "Los números de la cuenta y sus stats derivadas — incluidos los guardados, la señal de valor que TikTok no expone.",
      },
      {
        target: '[data-tour="panel-insights"]',
        title: "Cuándo rinden tus Reels",
        description:
          "Promedios por día de publicación y hashtags top del periodo. Los Reels viejos se refrescan por rotación semanal.",
      },
      {
        target: '[data-tour="panel-videos"]',
        title: "Cada Reel, su detalle",
        description:
          "El listado del periodo con guardados incluidos. Toca una fila para abrir la curva de crecimiento del Reel.",
      },
    ],
  },
  "/video": {
    version: 1,
    steps: [
      {
        target: '[data-tour="video-info"]',
        title: "El video y su contexto",
        description:
          "Caption, hashtags y fecha en tu zona horaria — los mismos datos de los que se deriva la clasificación por tipo.",
      },
      {
        target: '[data-tour="video-stats"]',
        title: "Métrica vigente",
        description:
          "La última captura del video: todo sale de los snapshots diarios. La card en lima es la métrica destacada.",
      },
      {
        target: '[data-tour="video-curva"]',
        title: "Crecimiento y benchmark",
        description:
          "La curva de vistas desde la publicación y el múltiplo contra lo típico de su misma semana — comparable entre meses.",
      },
    ],
  },
  "/settings/connections": {
    version: 1,
    steps: [
      {
        target: '[data-tour="conexiones-header"]',
        title: "Estado de tus cuentas",
        description:
          "Aquí vive la salud de las conexiones: tokens, fechas de expiración y la última captura de cada plataforma.",
      },
      {
        target: '[data-tour="conexiones-cuentas"]',
        title: "Reconecta sin drama",
        description:
          "Si un token expira o Meta pide re-verificación, la ingesta se detiene en silencio: este es el lugar para revivirla.",
      },
    ],
  },
  "/settings/mcp": {
    version: 1,
    steps: [
      {
        target: '[data-tour="mcp-servidor"]',
        title: "Tu analítica, desde Claude",
        description:
          "La URL del servidor MCP para agregarlo como conector remoto — con OAuth, sin pegar tokens a mano.",
      },
      {
        target: '[data-tour="mcp-conectores"]',
        title: "Quién tiene acceso",
        description:
          "Los clientes autorizados y si su token sigue vigente. Todo es de solo lectura: nadie puede publicar ni modificar.",
      },
      {
        target: '[data-tour="mcp-tools"]',
        title: "Lo que Claude puede consultar",
        description:
          "El catálogo de tools de solo lectura: buscar videos, stats con corte por edad, timelines, hashtags y breakouts.",
      },
    ],
  },
};
