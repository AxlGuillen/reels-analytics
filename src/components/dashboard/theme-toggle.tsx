"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@animateicons/react/lucide";
import { Monitor } from "lucide-react";
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
 * Botón de tema. Cicla claro → oscuro → sistema. Espera al montaje para leer el
 * tema (evita desajuste de hidratación con SSR). Dos presentaciones:
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
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  // Marcador de posición del mismo tamaño hasta montar (sin parpadeo de icono).
  const current = mounted ? theme : undefined;
  const next =
    current === "light" ? "dark" : current === "dark" ? "system" : "light";

  const label =
    current === "light"
      ? "Tema: claro"
      : current === "dark"
        ? "Tema: oscuro"
        : "Tema: sistema";

  const icon =
    current === "light" ? (
      <SunIcon size={variant === "icon" ? 15 : 18} className="shrink-0" />
    ) : current === "dark" ? (
      <MoonIcon size={variant === "icon" ? 15 : 18} className="shrink-0" />
    ) : (
      <Monitor className={variant === "icon" ? "size-[15px] shrink-0" : "size-[18px] shrink-0"} />
    );

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
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
      onClick={() => setTheme(next)}
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
