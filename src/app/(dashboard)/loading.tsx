import {
  OverviewBodySkeleton,
  OverviewHeaderSkeleton,
} from "./overview-skeleton";

/**
 * Loading del segmento raíz (Overview) — se muestra al NAVEGAR a `/` desde otra
 * ruta. Usa el mismo shell y skeleton que el `<Suspense>` de la page para que
 * el swap no salte (el loading.tsx anterior usaba otro shell y otro h1).
 * OJO: los cambios de searchParams (?period=&anchor=) NO pasan por aquí; de
 * esos se encarga el Suspense-con-key dentro de page.tsx.
 */
export default function Loading() {
  return (
    <div className="w-full px-4 py-6 md:px-1">
      <OverviewHeaderSkeleton />
      <OverviewBodySkeleton />
    </div>
  );
}
