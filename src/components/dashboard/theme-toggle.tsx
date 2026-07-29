"use client";

import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { MoonIcon, SunIcon } from "@animateicons/react/lucide";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/** `true` solo tras hidratar (sin setState en efecto: evita el lint y el flash). */
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Duración del reveal (dentro del rango 150–300 ms del contrato de estilo). */
const REVEAL_MS = 300;

/**
 * Botón de tema. Alterna claro ↔ oscuro (sin opción "sistema"; un `theme=system`
 * heredado se resuelve vía `resolvedTheme` y el primer clic fija uno explícito).
 * Espera al montaje para leer el tema (evita desajuste de hidratación con SSR).
 * Tres presentaciones:
 * - `row`: fila completa del nav.
 * - `icon`: botón cuadrado bordeado, para incrustar sobre fondo claro.
 * - `rail`: tile de 38px del rail oscuro (usa los tokens `sidebar-*`).
 */
export function ThemeToggle({
  collapsed = false,
  variant = "row",
}: {
  collapsed?: boolean;
  variant?: "row" | "icon" | "rail";
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  // Marcador de posición del mismo tamaño hasta montar (sin parpadeo de icono).
  const isDark = mounted ? resolvedTheme === "dark" : false;
  const label = isDark ? "Tema: oscuro" : "Tema: claro";

  /**
   * Cambia el tema con un "circular reveal" (View Transitions API): el tema
   * nuevo se destapa en un círculo que crece desde el botón clicado. Degrada a
   * cambio instantáneo sin soporte del navegador o con reduced-motion.
   */
  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = isDark ? "light" : "dark";
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!("startViewTransition" in document) || reduceMotion) {
      setTheme(next);
      return;
    }

    // Origen de la gota: centro del botón. Radio: hasta la esquina más lejana.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    // flushSync: next-themes debe aplicar la clase al <html> DENTRO del
    // callback, o el snapshot "nuevo" saldría idéntico al viejo.
    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
    void transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: REVEAL_MS,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

  const iconSize = variant === "icon" ? 15 : variant === "rail" ? 17 : 18;
  const icon = isDark ? (
    <MoonIcon size={iconSize} className="shrink-0" />
  ) : (
    <SunIcon size={iconSize} className="shrink-0" />
  );

  if (variant === "rail") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className="text-sidebar-foreground/40 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground flex size-[38px] shrink-0 items-center justify-center rounded-[14px] transition-colors duration-150"
      >
        {icon}
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className="border-border bg-card text-muted-foreground hover:text-foreground hover:border-ring/40 flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors duration-150"
      >
        {icon}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={cn(
        "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
        collapsed && "justify-center px-0",
      )}
    >
      {icon}
      {!collapsed && <span>{mounted ? label : "Tema"}</span>}
    </button>
  );
}
