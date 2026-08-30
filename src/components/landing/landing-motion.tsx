"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

/**
 * Motor de animación de la landing (GSAP + ScrollTrigger + SplitText vía
 * useGSAP). Único punto de entrada de gsap en toda la app: se importa aquí
 * (client component de la ruta), así que vive en el chunk de /landing y el
 * dashboard nunca lo descarga.
 *
 * El markup no depende de esto: con `prefers-reduced-motion` (gsap.matchMedia)
 * o sin JS, la página queda en su composición estática final — los efectos usan
 * `gsap.from`, de modo que el SSR es el estado terminado. useGSAP revierte todo
 * (tweens, ScrollTriggers y splits) al desmontar.
 *
 * Contrato con la página (atributos en el markup del server):
 * - `data-hero-item` / `data-hero-piece` → timeline de entrada del hero
 *   (texto en cascada; el collage asienta con rotación y rebote).
 * - `data-reveal`          → el bloque entra con fade-up al verse (una vez).
 * - `data-reveal-stagger`  → sus HIJOS entran en cascada (grids de cards).
 * - `data-bars` / `data-bar`      → barras verticales crecen (scaleY).
 * - `data-bars-x` / `data-bar-x`  → barras horizontales crecen (scaleX).
 * - `data-split`           → titular se revela palabra por palabra (SplitText).
 * - `data-plx="slow|mid|fast"` dentro de `data-plx-scope` → parallax con
 *   scrub (±28/±70/±120 px) ligado al paso de la banda por el viewport.
 */

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

// La banda parallax es full-bleed: con más lienzo, más recorrido por capa.
const PLX_TRAVEL: Record<string, number> = { slow: 36, mid: 90, fast: 150 };

/** Trigger estándar de los efectos de entrada: al asomarse, una sola vez. */
const onEnter = (trigger: Element, start = "top 85%") => ({
  trigger,
  start,
  once: true,
});

export function LandingMotion({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Intro del hero: cascada de texto y el collage asentándose. Corre al
        // cargar (sin ScrollTrigger: el hero ya está en viewport).
        gsap
          .timeline({ defaults: { ease: "power2.out", duration: 0.6 } })
          .from("[data-hero-item]", { y: 24, autoAlpha: 0, stagger: 0.12 })
          .from(
            "[data-hero-piece]",
            {
              scale: 0.85,
              autoAlpha: 0,
              rotation: "+=6", // parte 6° pasado de su rotación final y asienta
              stagger: 0.1,
              ease: "back.out(1.6)",
            },
            "-=0.55",
          );

        // Bloques sueltos: fade-up del conjunto.
        for (const el of gsap.utils.toArray<HTMLElement>("[data-reveal]")) {
          gsap.from(el, {
            y: 28,
            autoAlpha: 0,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: onEnter(el),
          });
        }

        // Grids: los hijos entran en cascada (stagger > tweens sueltos).
        for (const grid of gsap.utils.toArray<HTMLElement>(
          "[data-reveal-stagger]",
        )) {
          gsap.from(grid.children, {
            y: 26,
            autoAlpha: 0,
            duration: 0.55,
            ease: "power2.out",
            stagger: 0.09,
            scrollTrigger: onEnter(grid),
          });
        }

        // Barras de las gráficas: crecen desde su base. Solo transform
        // (scaleY/scaleX), nunca height/width — el layout no se recalcula.
        for (const chart of gsap.utils.toArray<HTMLElement>("[data-bars]")) {
          gsap.from(chart.querySelectorAll("[data-bar]"), {
            scaleY: 0,
            transformOrigin: "50% 100%",
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.06,
            scrollTrigger: onEnter(chart, "top 80%"),
          });
        }
        for (const list of gsap.utils.toArray<HTMLElement>("[data-bars-x]")) {
          gsap.from(list.querySelectorAll("[data-bar-x]"), {
            scaleX: 0,
            transformOrigin: "0% 50%",
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.1,
            scrollTrigger: onEnter(list, "top 80%"),
          });
        }

        // Titulares destacados: palabra por palabra. Solo `words` (partir en
        // chars o lines sería más caro y sensible al ancho).
        for (const el of gsap.utils.toArray<HTMLElement>("[data-split]")) {
          const split = SplitText.create(el, { type: "words" });
          gsap.from(split.words, {
            y: 22,
            autoAlpha: 0,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.05,
            scrollTrigger: onEnter(el, "top 80%"),
          });
        }

        // Parallax de la banda: tres velocidades ligadas al scroll (scrub)
        // mientras su `data-plx-scope` cruza el viewport.
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

      // Las fuentes cambian el alto de los textos → re-medir los triggers.
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    },
    { scope },
  );

  return (
    <div ref={scope} className="contents">
      {children}
    </div>
  );
}
