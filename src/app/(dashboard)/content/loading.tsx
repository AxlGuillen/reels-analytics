import { ContentSummarySkeleton } from "./content-skeleton";

/** Navegación ENTRE rutas hacia /content (el drill-down y los filtros los
 *  cubre el Suspense de la page, que sí conoce `type`). */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.9rem] font-medium tracking-[-0.025em]">
            Contenido
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tu catálogo dividido por tipo de contenido (hashtag identificador).
          </p>
        </div>
      </header>
      <ContentSummarySkeleton />
    </div>
  );
}
