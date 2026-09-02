import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonStatCard } from "@/components/dashboard/skeletons";

/**
 * Skeleton del detalle de video (compartido por /video/tiktok/[id] y
 * /video/instagram/[id]): back-link, thumb 180×240 + bloque de identidad,
 * grid de KPIs y la card de crecimiento. Lo usan los `loading.tsx` de ambos
 * segmentos (aquí cambia el path, así que loading.tsx basta — sin Suspense).
 */
export function VideoDetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 md:px-8"
    >
      <span className="sr-only">Cargando…</span>
      <Skeleton className="h-4 w-40 rounded-full" />

      <div className="flex flex-col gap-6 sm:flex-row">
        <Skeleton className="h-[240px] w-[180px] shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-6 w-3/4 rounded-full" />
          <Skeleton className="h-3.5 w-48 rounded-full" />
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SkeletonStatCard tone="accent" hint={false} />
        <SkeletonStatCard hint={false} />
        <SkeletonStatCard hint={false} />
        <SkeletonStatCard hint={false} />
        <SkeletonStatCard hint={false} />
        <SkeletonStatCard hint={false} />
      </div>

      <div className="bg-card shadow-card rounded-lg p-[18px]">
        <Skeleton className="h-4 w-32 rounded-full" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <Skeleton className="mt-4 h-48 w-full" />
      </div>
    </div>
  );
}
