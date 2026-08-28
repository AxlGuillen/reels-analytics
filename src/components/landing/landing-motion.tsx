"use client";

import { useEffect } from "react";

/**
 * Motor de animación de la landing (GSAP + ScrollTrigger). Único punto de
 * entrada de gsap en toda la app: el paquete se importa DINÁMICO tras hidratar,
 * así vive en un chunk propio de esta ruta y el dashboard nunca lo descarga.
 *
 * El markup no depende de esto: sin JS (o con `prefers-reduced-motion`) la
 * página queda en su composición estática final — por eso los reveals usan
 * `gsap.from` (el estado SSR es el estado terminado).
 *
 * Contrato con la página:
 * - `data-reveal`         → entra con fade-up la primera vez que se ve.
 * - `data-plx="slow|mid|fast"` → capa de parallax ligada al scroll (scrub)
 *   dentro de su `data-plx-scope` más cercano.
 */

const PLX_TRAVEL: Record<string, number> = { slow: 28, mid: 70, fast: 120 };

export function LandingMotion() {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        for (const el of gsap.utils.toArray<HTMLElement>("[data-reveal]")) {
          gsap.from(el, {
            y: 28,
            autoAlpha: 0,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
        }
        for (const el of gsap.utils.toArray<HTMLElement>("[data-plx]")) {
          const travel = PLX_TRAVEL[el.dataset.plx ?? ""];
          if (!travel) continue;
          gsap.fromTo(
            el,
            { y: travel },
            {
              y: -travel,
              ease: "none",
              scrollTrigger: {
                trigger: el.closest<HTMLElement>("[data-plx-scope]") ?? el,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        }
      });
      cleanup = () => mm.revert();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return null;
}
