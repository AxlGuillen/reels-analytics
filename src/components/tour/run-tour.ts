import { TOURS } from "./steps";

/**
 * Arranque compartido del tour (lo usan el auto-start de `PageTour` y el botón
 * de ayuda del rail). Solo se ejecuta en cliente: toca DOM y localStorage.
 *
 * Singleton a nivel de módulo: nunca hay dos tours a la vez. Arrancar uno nuevo
 * destruye el anterior, y `destroyActiveTour()` permite matar el activo al
 * cambiar de ruta (las anclas de la página anterior ya no existen).
 */

/** Clave de "ya visto" por ruta y versión (mismo patrón localStorage del rail). */
export const seenKey = (route: string, version: number) =>
  `tour-seen:${route}:v${version}`;

let active: { destroy: () => void } | null = null;

/** Destruye el tour activo si lo hay (p. ej. al navegar a otra ruta). */
export function destroyActiveTour(): void {
  active?.destroy();
  active = null;
}

/**
 * Lanza el tour de una ruta del registro. Filtra las anclas ausentes (estados
 * vacíos degradan en silencio) y marca "visto" al cerrar o terminar. Devuelve
 * `false` si no había nada que mostrar (sin tour o sin anclas presentes).
 */
export async function runTour(route: keyof typeof TOURS): Promise<boolean> {
  const tour = TOURS[route];
  if (!tour) return false;

  const { driver } = await import("driver.js");

  const present = tour.steps.filter((s) => document.querySelector(s.target));
  if (present.length === 0) return false;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  destroyActiveTour();
  const d = driver({
    showProgress: true,
    animate: !reduceMotion,
    // var(): el overlay respeta el tema (tinta en claro, niebla crema en oscuro).
    overlayColor: "var(--foreground)",
    overlayOpacity: 0.55,
    nextBtnText: "Siguiente",
    prevBtnText: "Anterior",
    doneBtnText: "Listo",
    progressText: "{{current}} de {{total}}",
    onDestroyed: () => {
      localStorage.setItem(seenKey(route, tour.version), "1");
      if (active === d) active = null;
    },
    steps: present.map((s) => ({
      element: s.target,
      popover: { title: s.title, description: s.description },
    })),
  });
  active = d;
  d.drive();
  return true;
}
