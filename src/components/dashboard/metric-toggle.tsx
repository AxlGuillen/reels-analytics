"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type MetricMode = "total" | "age7";

const OPTIONS: { value: MetricMode; label: string }[] = [
  { value: "total", label: "Vistas totales" },
  { value: "age7", label: "Vistas a 7 días" },
];

/**
 * Alterna la base de las gráficas de día/hora/hashtags entre vistas acumuladas
 * de por vida y vistas normalizadas a los 7 días de publicado (comparación justa
 * entre videos de distinta antigüedad). Navega con `?metric=` preservando la query.
 */
export function MetricToggle({ active }: { active: MetricMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onSelect(value: MetricMode) {
    const params = new URLSearchParams(searchParams);
    if (value === "total") params.delete("metric");
    else params.set("metric", value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex gap-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onSelect(o.value)}
          aria-pressed={o.value === active}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            o.value === active
              ? "border-transparent bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
