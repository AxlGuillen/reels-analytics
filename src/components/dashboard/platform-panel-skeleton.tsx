import { Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonStatCard,
  SkeletonTable,
} from "@/components/dashboard/skeletons";

/**
 * Skeleton compartido de los paneles por plataforma (/tiktok y /instagram):
 * header de cuenta (avatar + identidad + 4 KPIs), bloque de insights (4 KPIs)
 * y la tabla de videos de 9 columnas con miniaturas. Lo usan los `loading.tsx`
 * de ambos segmentos y el `<Suspense>` del cambio de rango. Sin `data-tour`.
 */
export function PlatformPanelSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-8">
      <span className="sr-only">Cargando…</span>
      {/* Header de cuenta */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div>
            <Skeleton className="h-4 w-40 rounded-full" />
            <Skeleton className="mt-2 h-3 w-56 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SkeletonStatCard tone="accent" hint={false} />
          <SkeletonStatCard hint={false} />
          <SkeletonStatCard hint={false} />
          <SkeletonStatCard hint={false} />
        </div>
      </div>

      {/* Insights del periodo */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-48 rounded-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SkeletonStatCard hint={false} />
          <SkeletonStatCard tone="accent" hint={false} />
          <SkeletonStatCard hint={false} />
          <SkeletonStatCard hint={false} />
        </div>
      </div>

      {/* Tabla de videos */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32 rounded-full" />
        <SkeletonTable cols={7} rows={8} thumb />
      </div>
    </div>
  );
}
