import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/**
 * Motor de animación de la landing (GSAP + ScrollTrigger + SplitText). ÚNICO
 * punto de entrada de gsap en toda la app — y a propósito en un chunk ASYNC:
 * `LandingMotion` lo importa dinámicamente en idle, así que estos ~70 KB no
 * viajan ni se evalúan en el chunk crítico de la ruta (eran el task largo que
 * dominaba el TBT en móvil). Los efectos son todos de scroll: llegar ~1 s
 * tarde es imperceptible.
 *
 * El markup no depende de esto: con `prefers-reduced-motion` (gsap.matchMedia)
 * o sin JS, la página queda en su composición estática final — los efectos usan
 * `gsap.from`, de modo que el SSR es el estado terminado. `gsap.context`
 * acota los selectores al scope y revierte todo al desmontar.
 *
 * La intro del hero NO vive aquí: es CSS puro (`.hero-item`/`.hero-piece`/
 * `.hero-slide` en globals) porque el H1 es el elemento LCP y esperar a este
 * chunk lo retrasaba ~2,5 s en móvil.
 *
 * Contrato con la página (atributos en el markup del server):
 * - `data-reveal`          → el bloque entra con fade-up al verse (una vez).
 * - `data-reveal-stagger`  → sus HIJOS entran en cascada (grids de cards).
 * - `data-bars` / `data-bar`      → barras verticales crecen (scaleY).
 * - `data-bars-x` / `data-bar-x`  → barras horizontales crecen (scaleX).
 * - `data-split`           → titular se revela palabra por palabra (SplitText).
 * - `data-scroll-progress`  → cápsula del borde: scaleY = avance del scroll.
 * - `data-plx="slow|mid|fast"` dentro de `data-plx-scope` → parallax con
 *   scrub (±60/±130/±220 px; `slow` viaja en sentido contrario) ligado al
 *   paso de su scope por el viewport.
 */

gsap.registerPlugin(ScrollTrigger, SplitText);

// Recorridos amplios (la banda es full-bleed) — sin esto el efecto no se nota.
const PLX_TRAVEL: Record<string, number> = { slow: 60, mid: 130, fast: 220 };

/** Trigger estándar de los efectos de entrada: al asomarse, una sola vez. */
const onEnter = (trigger: Element, start = "top 85%") => ({
  trigger,
  start,
  once: true,
});

/** Monta todos los efectos dentro de `scope`; devuelve el cleanup. */
export function initLandingEffects(scope: HTMLElement): () => void {
  const ctx = gsap.context(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
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

      // Indicador del borde: la cápsula crece con el avance TOTAL de la
      // página (start 0 → end "max"). El estado inicial (scale-y-0) viene
      // del CSS: sin JS el riel queda vacío, no lleno.
      for (const el of gsap.utils.toArray<HTMLElement>(
        "[data-scroll-progress]",
      )) {
        gsap.to(el, {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { start: 0, end: "max", scrub: 0.4 },
        });
      }

      // Parallax: tres velocidades ligadas al scroll mientras su
      // `data-plx-scope` cruza el viewport. La capa `slow` (fondos) viaja en
      // sentido CONTRARIO al resto: el movimiento relativo entre capas es lo
      // que se lee como profundidad. `scrub: 0.6` añade un pelín de lag que
      // hace el efecto visible incluso en scrolls rápidos.
      for (const el of gsap.utils.toArray<HTMLElement>("[data-plx]")) {
        const travel = PLX_TRAVEL[el.dataset.plx ?? ""];
        if (!travel) continue;
        const direction = el.dataset.plx === "slow" ? -1 : 1;
        gsap.fromTo(
          el,
          { y: travel * direction },
          {
            y: -travel * direction,
            ease: "none",
            scrollTrigger: {
              trigger: el.closest<HTMLElement>("[data-plx-scope]") ?? el,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
            },
          },
        );
      }
    });

    // Las fuentes cambian el alto de los textos → re-medir los triggers.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, scope);

  return () => ctx.revert();
}
