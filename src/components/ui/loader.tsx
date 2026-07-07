import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Spinner inline reutilizable (hereda tamaño/color del contexto). */
export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("size-4 animate-spin motion-reduce:animate-none", className)}
      aria-hidden
    />
  );
}

/**
 * Estado de carga a nivel de sección/página. Pensado para `loading.tsx`
 * (Suspense) o cualquier bloque que espere datos del servidor.
 */
export function Loader({
  label = "Cargando…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "text-muted-foreground flex min-h-[240px] flex-col items-center justify-center gap-3",
        className,
      )}
    >
      <Spinner className="size-6" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
