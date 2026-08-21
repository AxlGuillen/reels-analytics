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
};
