import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonPill } from "@/components/dashboard/skeletons";

/**
 * Skeleton del Overview: espeja la geometría real de page.tsx (grid de 3 KPI
 * con sus tonos plain/lima/tinta, chart de cápsulas h-[214px], tipos de
 * contenido y el aside de 246px) para que el swap no salte. Lo usan el
 * `loading.tsx` del segmento (primera navegación) y el `<Suspense>` de la page
 * (cambios de periodo). Sin `data-tour` a propósito.
 */

function KpiSkeleton({ tone }: { tone: "plain" | "accent" | "dark" }) {
  const surface =
    tone === "accent"
      ? "bg-primary shadow-card"
      : tone === "dark"
        ? "bg-foreground shadow-lift sm:col-span-2 lg:col-span-1"
        : "bg-card shadow-card";
  const block =
    tone === "accent"
      ? "bg-primary-foreground/15"
      : tone === "dark"
        ? "bg-background/15"
        : undefined;

  return (
    <div className={`relative overflow-hidden rounded-lg p-[18px] ${surface}`}>
      <div className="flex items-center gap-2.5">
        <Skeleton className={`size-[26px] rounded-[9px] ${block ?? ""}`} />
        <Skeleton className={`h-3.5 w-20 rounded-full ${block ?? ""}`} />
      </div>
      <Skeleton className={`mt-4 h-11 w-32 ${block ?? ""}`} />
      {/* Tira de cápsulas de progreso (h-9). */}
      <div className="mt-4 flex gap-1.5">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className={`h-9 flex-1 rounded-[9px] ${block ?? ""}`} />
        ))}
      </div>
    </div>
  );
}

/** Solo el cuerpo (lo que envuelve el Suspense de la page). */
export function OverviewBodySkeleton() {
  return (
    <div className="flex flex-col gap-3.5 xl:flex-row">
      {/* Columna principal */}
      <div className="min-w-0 flex-1">
        <section className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <KpiSkeleton tone="plain" />
          <KpiSkeleton tone="accent" />
          <KpiSkeleton tone="dark" />
        </section>

        {/* Chart de cápsulas */}
        <div className="bg-card shadow-card mt-3.5 rounded-lg p-[18px]">
          <div className="mb-1 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-[26px] rounded-[9px]" />
              <Skeleton className="h-5 w-36 rounded-full" />
            </div>
            <SkeletonPill className="h-7 w-28" />
          </div>
          <div className="flex h-[214px] items-end justify-around gap-2 pt-3 pb-7">
            {["h-16", "h-28", "h-44", "h-24", "h-20", "h-32", "h-14"].map(
              (h, i) => (
                <Skeleton key={i} className={`w-[26px] rounded-full ${h}`} />
              ),
            )}
          </div>
        </div>

        {/* Tipos de contenido */}
        <div className="bg-card shadow-card mt-3.5 rounded-lg p-[18px]">
          <Skeleton className="mb-4 h-4 w-40 rounded-full" />
          <div className="flex flex-col gap-4 py-1">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-[74px] rounded-full" />
                <Skeleton className="h-4 flex-1 rounded-full" />
                <Skeleton className="h-3 w-[56px] rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Columna lateral */}
      <aside className="flex w-full shrink-0 flex-col gap-3 xl:w-[246px]">
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="bg-card shadow-card flex h-[88px] flex-col justify-between rounded-[20px] p-3.5"
            >
              <Skeleton className="size-[26px] rounded-[9px]" />
              <div>
                <Skeleton className="h-3.5 w-16 rounded-full" />
                <Skeleton className="mt-1.5 h-2.5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-card shadow-card flex flex-1 flex-col rounded-[20px] p-4">
          <div className="border-border border-b pb-4">
            <Skeleton className="size-[26px] rounded-[9px]" />
            <Skeleton className="mt-2.5 h-3.5 w-24 rounded-full" />
            <Skeleton className="mt-1.5 h-2.5 w-36 rounded-full" />
          </div>
          <div className="pt-4">
            <Skeleton className="size-[26px] rounded-[9px]" />
            <Skeleton className="mt-2.5 h-3.5 w-24 rounded-full" />
            <Skeleton className="mt-1.5 h-2.5 w-36 rounded-full" />
          </div>
        </div>
      </aside>
    </div>
  );
}

/** Header como skeleton: solo para `loading.tsx`, que no conoce searchParams
 *  (la page real pinta el header de verdad al instante). */
export function OverviewHeaderSkeleton() {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <Skeleton className="h-10 w-[340px] max-w-full rounded-full" />
      <div className="flex items-center gap-2">
        <SkeletonPill className="w-32" />
        <SkeletonPill className="w-40" />
      </div>
    </header>
  );
}
