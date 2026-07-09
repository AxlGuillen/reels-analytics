"use client";

import { useRef } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { LogoutIcon } from "@animateicons/react/lucide";
import { buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";

/** Handle imperativo del icono animado (subconjunto que usamos). */
interface IconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

/**
 * Fila "Cerrar sesión" del sidebar que confirma antes de salir. El trigger
 * conserva el estilo (y la animación de icono en hover) de las demás filas; la
 * confirmación dispara el server action dentro de un `<form>`.
 */
export function LogoutButton({ collapsed }: { collapsed: boolean }) {
  const iconRef = useRef<IconHandle>(null);

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger
        aria-label="Cerrar sesión"
        title={collapsed ? "Cerrar sesión" : undefined}
        onMouseEnter={() => iconRef.current?.startAnimation()}
        onMouseLeave={() => iconRef.current?.stopAnimation()}
        className={cn(
          "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
          collapsed && "justify-center px-0",
        )}
      >
        <LogoutIcon ref={iconRef} size={18} className="shrink-0" />
        {!collapsed && "Cerrar sesión"}
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="bg-foreground/40 fixed inset-0 z-50 backdrop-blur-[2px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <AlertDialog.Popup className="bg-card text-card-foreground shadow-lift fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 transition-all duration-200 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <AlertDialog.Title className="font-display text-lg font-semibold tracking-wide">
            ¿Cerrar sesión?
          </AlertDialog.Title>
          <AlertDialog.Description className="text-muted-foreground mt-1.5 text-sm">
            Se cerrará tu sesión y volverás a la pantalla de inicio.
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2.5">
            <AlertDialog.Close
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Cancelar
            </AlertDialog.Close>
            <form action={signOutAction}>
              <button type="submit" className={buttonVariants({ size: "lg" })}>
                Cerrar sesión
              </button>
            </form>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
