import { cn } from "@/lib/utils";

/**
 * Bloque de skeleton (patrón shadcn, escrito a mano — sin dependencia nueva).
 * `bg-muted` pulsando; el pulso se apaga con prefers-reduced-motion, igual que
 * el Spinner. Sobre superficies de color (lima/tinta) pásale su alpha propio
 * vía className (`bg-primary-foreground/15`, `bg-background/15`).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-muted animate-pulse rounded-md motion-reduce:animate-none",
        className,
      )}
      aria-hidden
    />
  );
}
