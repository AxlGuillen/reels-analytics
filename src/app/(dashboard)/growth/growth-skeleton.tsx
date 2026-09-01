import {
  SkeletonCard,
  SkeletonStatCard,
  SkeletonTable,
} from "@/components/dashboard/skeletons";

/**
 * Skeleton de /growth: versión representativa de la página (KPIs de cuenta,
 * chart de seguidores, tabla por tipo, KPIs de highlights y charts de
 * insights). No replica los ~10 bloques completos — con el primer viewport y
 * un poco más basta para que el swap no salte. Sin `data-tour`.
 */
export function GrowthBodySkeleton() {
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonStatCard tone="accent" />
        <SkeletonStatCard />
      </section>

      <SkeletonCard bodyClassName="h-64" />

      <div className="bg-card shadow-card rounded-lg p-[18px]">
        <div className="mb-4 h-4 w-56">
          <SkeletonCardTitle />
        </div>
        <SkeletonTable cols={5} rows={5} />
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <SkeletonStatCard />
        <SkeletonStatCard tone="accent" />
        <SkeletonStatCard />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard bodyClassName="h-52" />
        <SkeletonCard bodyClassName="h-52" />
      </div>
    </>
  );
}

function SkeletonCardTitle() {
  return <div className="bg-muted h-4 w-full animate-pulse rounded-full motion-reduce:animate-none" />;
}
