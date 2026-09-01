"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Feedback pre-RTT para `<Link>` de filtros/navegación por query params: hasta
 * que el servidor responde con el RSC payload nuevo no cambia NADA en pantalla
 * (los cambios de searchParams no disparan loading.tsx), así que este wrapper
 * — hijo del Link, donde `useLinkStatus` aplica — atenúa el contenido mientras
 * la navegación está pendiente. La transición es de opacidad (compositor) y
 * corta; con reduced-motion el cambio es instantáneo pero sigue visible.
 */
export function LinkPending({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 transition-opacity duration-200 motion-reduce:transition-none",
        pending && "opacity-40",
        className,
      )}
    >
      {children}
    </span>
  );
}
