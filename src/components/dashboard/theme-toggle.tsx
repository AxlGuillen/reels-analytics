"use client";

import { useSyncExternalStore } from "react";
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

/**
 * Botón de tema. Alterna claro ↔ oscuro (sin opción "sistema"; un `theme=system`
 * heredado se resuelve vía `resolvedTheme` y el primer clic fija uno explícito).
 * Espera al montaje para leer el tema (evita desajuste de hidratación con SSR).
 * Dos presentaciones:
 * - `row`: fila completa del nav (rail colapsado).
 * - `icon`: botón cuadrado bordeado, para incrustar en la tarjeta de usuario.
 */
export function ThemeToggle({
  collapsed = false,
  variant = "row",
}: {
  collapsed?: boolean;
  variant?: "row" | "icon";
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  // Marcador de posición del mismo tamaño hasta montar (sin parpadeo de icono).
  const isDark = mounted ? resolvedTheme === "dark" : false;
  const label = isDark ? "Tema: oscuro" : "Tema: claro";
  const toggle = () => setTheme(isDark ? "light" : "dark");

  const icon = isDark ? (
    <MoonIcon size={variant === "icon" ? 15 : 18} className="shrink-0" />
  ) : (
    <SunIcon size={variant === "icon" ? 15 : 18} className="shrink-0" />
  );

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
