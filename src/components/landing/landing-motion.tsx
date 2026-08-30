"use client";

import { useEffect, useRef } from "react";

/**
 * Cáscara del motor de animación de la landing. NO importa gsap: carga
 * `landing-effects` (el chunk con GSAP) por `import()` dinámico en
 * `requestIdleCallback`, para que sus ~70 KB no viajen ni se evalúen dentro
 * del chunk crítico de la ruta — ese eval era el task largo que dominaba el
 * TBT en móvil. Todos los efectos son de scroll: montarlos ~1 s después de la
 * hidratación es imperceptible (la intro del hero es CSS puro y no depende de
 * esto).
 *
 * Sin JS o con reduced-motion la página queda en su composición estática:
 * el contrato de atributos (`data-reveal`, `data-plx`…) vive documentado en
 * `landing-effects.ts`.
 */
export function LandingMotion({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const start = () => {
      if (cancelled || !scope.current) return;
      void import("./landing-effects").then((mod) => {
        if (cancelled || !scope.current) return;
        cleanup = mod.initLandingEffects(scope.current);
      });
    };

    // Idle con timeout: si el navegador nunca se desocupa (scroll continuo),
    // arrancamos igual a los 1.5 s. Fallback para Safari (sin rIC).
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idleId = hasIdle
      ? window.requestIdleCallback(start, { timeout: 1500 })
      : window.setTimeout(start, 300);

    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      cleanup?.();
    };
  }, []);

  return (
    <div ref={scope} className="contents">
      {children}
    </div>
  );
}
