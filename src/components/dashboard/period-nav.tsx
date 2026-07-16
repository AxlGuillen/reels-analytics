import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Granularity = "week" | "month";

/** Href del Overview preservando granularidad + anchor (day key del periodo). */
function href(granularity: Granularity, anchor?: string | null): string {
  const params = new URLSearchParams();
  params.set("period", granularity);
  if (anchor) params.set("anchor", anchor);
  return `/?${params.toString()}`;
}

const arrowClass =
  "border-border bg-card text-muted-foreground hover:text-foreground hover:border-ring/40 flex size-8 items-center justify-center rounded-md border transition-colors";

/**
 * Control de periodo del Overview: toggle Semana/Mes + navegación ◀ ▶. Son
 * enlaces (query params), así que funciona sin JS de cliente. Al cambiar de
 * granularidad conserva el instante actual (`currentAnchor`).
 */
export function PeriodNav({
  granularity,
  label,
  currentAnchor,
  prevAnchor,
  nextAnchor,
}: {
  granularity: Granularity;
  label: string;
  currentAnchor: string;
  prevAnchor: string;
  nextAnchor: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="border-border bg-card divide-border inline-flex divide-x overflow-hidden rounded-md border">
        {(["week", "month"] as const).map((g) => (
          <Link
            key={g}
            href={href(g, currentAnchor)}
            aria-current={g === granularity ? "true" : undefined}
            className={cn(
              "px-3 py-1.5 text-xs transition-colors",
              g === granularity
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {g === "week" ? "Semana" : "Mes"}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <Link
          href={href(granularity, prevAnchor)}
          aria-label="Periodo anterior"
          className={arrowClass}
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="min-w-[7.5rem] text-center text-sm font-medium">
          {label}
        </span>
        {nextAnchor ? (
          <Link
            href={href(granularity, nextAnchor)}
            aria-label="Periodo siguiente"
            className={arrowClass}
          >
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span
            aria-hidden
            className={cn(arrowClass, "cursor-not-allowed opacity-40")}
          >
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}
