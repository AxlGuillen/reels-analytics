import { GrowthBodySkeleton } from "./growth-skeleton";

/** Navegación ENTRE rutas hacia /growth (los cambios de filtros los cubre el
 *  Suspense de la page). El header es real: no depende de searchParams. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.9rem] font-medium tracking-[-0.025em]">
            Crecimiento
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Historia acumulada desde los snapshots guardados.
          </p>
        </div>
      </header>
      <GrowthBodySkeleton />
    </div>
  );
}
