import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { StatTone } from "@/components/dashboard/stat-card";

/**
 * Composites de skeleton del dashboard: imitan la GEOMETRÍA de los componentes
 * reales (StatCard, cards con chart, tablas) para que el swap skeleton→contenido
 * no salte. Reglas del sistema:
 * - Sin `data-tour` (anchors.test.ts falla con anclas muertas).
 * - Server Components puros; el pulso respeta reduced-motion (ui/skeleton).
 * - Sobre superficies de color, los bloques usan el alpha del color propio
 *   (tokens), nunca hex.
 */

/** Espejo de StatCard: contenedor `rounded-lg p-[18px]` + tono. */
export function SkeletonStatCard({
  tone = "plain",
  hint = true,
}: {
  tone?: StatTone;
  hint?: boolean;
}) {
  const surface =
    tone === "accent"
      ? "bg-primary shadow-card"
      : tone === "dark"
        ? "bg-foreground shadow-lift"
        : "bg-card shadow-card";
  const block =
    tone === "accent"
      ? "bg-primary-foreground/15"
      : tone === "dark"
        ? "bg-background/15"
        : undefined;

  return (
    <div className={cn("relative overflow-hidden rounded-lg p-[18px]", surface)}>
      <div className="flex items-center gap-2.5">
        <Skeleton className={cn("size-[26px] rounded-[9px]", block)} />
        <Skeleton className={cn("h-3 w-20 rounded-full", block)} />
      </div>
      <Skeleton className={cn("mt-3 h-8 w-24", block)} />
      {hint && <Skeleton className={cn("mt-2 h-3 w-28 rounded-full", block)} />}
    </div>
  );
}

/** Card genérica: título + bloque de contenido del alto que pidas. */
export function SkeletonCard({
  bodyClassName = "h-40",
  className,
}: {
  bodyClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("bg-card shadow-card rounded-lg p-[18px]", className)}>
      <Skeleton className="h-4 w-44 rounded-full" />
      <Skeleton className={cn("mt-4 w-full", bodyClassName)} />
    </div>
  );
}

/** Tabla: header + filas; `thumb` añade la celda de miniatura 40×56. */
export function SkeletonTable({
  cols,
  rows = 6,
  thumb = false,
}: {
  cols: number;
  rows?: number;
  thumb?: boolean;
}) {
  return (
    <div className="w-full">
      <div className="border-border flex gap-3 border-b pb-2.5">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton
            key={i}
            className={cn("h-3 rounded-full", i < 2 ? "w-28" : "w-14")}
          />
        ))}
      </div>
      <div className="divide-border divide-y">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-3 py-2.5">
            {thumb && <Skeleton className="h-14 w-10 shrink-0 rounded" />}
            <Skeleton className="h-3.5 w-2/5 rounded-full" />
            {Array.from({ length: Math.max(1, cols - (thumb ? 2 : 1)) }, (_, c) => (
              <Skeleton key={c} className="h-3.5 flex-1 rounded-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Píldora (chips de filtros, labels de periodo). */
export function SkeletonPill({ className }: { className?: string }) {
  return <Skeleton className={cn("h-8 w-24 rounded-full", className)} />;
}
