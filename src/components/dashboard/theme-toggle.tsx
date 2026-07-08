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
 * Botón de tema con estilo de fila del nav. Cicla claro → oscuro → sistema.
 * Espera al montaje para leer el tema (evita desajuste de hidratación con SSR).
 */
export function ThemeToggle({ collapsed }: { collapsed: boolean }) {
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
      {current === "light" ? (
        <SunIcon size={18} className="shrink-0" />
      ) : current === "dark" ? (
        <MoonIcon size={18} className="shrink-0" />
      ) : (
        <Monitor className="size-[18px] shrink-0" />
      )}
      {!collapsed && <span>{mounted ? label : "Tema"}</span>}
    </button>
  );
}
