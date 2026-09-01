import { Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonStatCard,
  SkeletonTable,
} from "@/components/dashboard/skeletons";

/**
 * Skeletons de /content — dos variantes porque la page conoce `type` de forma
 * síncrona: resumen (grid de cards por tipo, la primera en lima) y drill-down
 * (4 StatCard + tabla de videos). Sin `data-tour`.
 */

export function ContentSummarySkeleton() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const lead = i === 0;
        const block = lead ? "bg-primary-foreground/15" : undefined;
        return (
          <div
            key={i}
            className={
              lead
                ? "bg-primary shadow-card relative overflow-hidden rounded-lg p-5"
                : "bg-card shadow-card rounded-lg p-5"
            }
          >
            <div className="flex items-center justify-between">
              <Skeleton className={`h-4 w-28 rounded-full ${block ?? ""}`} />
              <Skeleton className={`h-3 w-14 rounded-full ${block ?? ""}`} />
            </div>
            <Skeleton className={`mt-4 h-10 w-28 ${block ?? ""}`} />
            <Skeleton className={`mt-2 h-3 w-24 rounded-full ${block ?? ""}`} />
            <div className="border-border/60 mt-4 grid grid-cols-2 gap-3 border-t pt-3">
              <Skeleton className={`h-8 ${block ?? ""}`} />
              <Skeleton className={`h-8 ${block ?? ""}`} />
            </div>
          </div>
        );
      })}
    </section>
  );
}

export function ContentDrilldownSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SkeletonStatCard tone="accent" hint={false} />
        <SkeletonStatCard hint={false} />
        <SkeletonStatCard hint={false} />
        <SkeletonStatCard hint={false} />
      </section>
      <Skeleton className="h-4 w-72 rounded-full" />
      <div className="bg-card shadow-card rounded-lg p-[18px]">
        <SkeletonTable cols={6} rows={8} thumb />
      </div>
    </div>
  );
}
