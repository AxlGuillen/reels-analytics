"use client";

import { useEffect } from "react";
import "driver.js/dist/driver.css";
import { TOURS } from "./steps";
import { destroyActiveTour, runTour, seenKey } from "./run-tour";

/** Espera (ms) tras hidratar antes de arrancar: deja asentarse layout y fuentes. */
const START_DELAY_MS = 600;

/**
 * Auto-start del tour de la ruta SOLO la primera visita (localStorage); cerrar
 * a medias también marca visto — no se insiste. El botón de ayuda del rail
 * relanza a demanda vía `runTour`. Renderiza null: las páginas (Server
 * Components) solo lo montan al final.
 */
export function PageTour({ route }: { route: keyof typeof TOURS }) {
  useEffect(() => {
    const tour = TOURS[route];
    if (!tour) return;
    if (localStorage.getItem(seenKey(route, tour.version))) return;

    const timer = setTimeout(() => void runTour(route), START_DELAY_MS);
    return () => {
      clearTimeout(timer);
      // Al desmontar (navegación) las anclas desaparecen: muere el tour activo,
      // lo haya lanzado el auto-start o el botón de ayuda.
      destroyActiveTour();
    };
  }, [route]);

  return null;
}
