"use client";

import { useEffect } from "react";
import "driver.js/dist/driver.css";
import { TOURS } from "./steps";

/** Clave de "ya visto" por ruta y versión (mismo patrón localStorage del rail). */
const seenKey = (route: string, version: number) => `tour-seen:${route}:v${version}`;

/** Espera (ms) tras hidratar antes de arrancar: deja asentarse layout y fuentes. */
const START_DELAY_MS = 600;

/**
 * Tour guiado de la ruta (Driver.js). Auto-arranca solo la PRIMERA visita
 * (localStorage) y se marca visto al cerrar o terminar — cerrarlo a medias
 * también cuenta como visto: no se insiste. El JS de driver.js se importa
 * dinámicamente al arrancar, así quien ya lo vio no paga el bundle.
 *
 * Renderiza null: las páginas (Server Components) solo lo montan al final.
 */
export function PageTour({ route }: { route: keyof typeof TOURS }) {
  useEffect(() => {
    const tour = TOURS[route];
    if (!tour) return;
    const key = seenKey(route, tour.version);
    if (localStorage.getItem(key)) return;

    let cancelled = false;
    let instance: { destroy: () => void } | null = null;

    const timer = setTimeout(async () => {
      const { driver } = await import("driver.js");
      if (cancelled) return;

      // Anclas condicionales (sin datos, desconectado…): se saltan en silencio.
      const present = tour.steps.filter((s) => document.querySelector(s.target));
      if (present.length === 0) return;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const d = driver({
        showProgress: true,
        animate: !reduceMotion,
        // var(): el overlay respeta el tema (tinta en claro, negro en oscuro).
        overlayColor: "var(--foreground)",
        overlayOpacity: 0.55,
        nextBtnText: "Siguiente",
        prevBtnText: "Anterior",
        doneBtnText: "Listo",
        progressText: "{{current}} de {{total}}",
        onDestroyed: () => localStorage.setItem(key, "1"),
        steps: present.map((s) => ({
          element: s.target,
          popover: { title: s.title, description: s.description },
        })),
      });
      instance = d;
      d.drive();
    }, START_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      instance?.destroy();
    };
  }, [route]);

  return null;
}
