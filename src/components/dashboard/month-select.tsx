"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface MonthOption {
  value: string; // YYYY-MM
  label: string;
}

/**
 * Selector de mes para acotar las gráficas de día/hashtags. Navega cambiando
 * `?month=` y **preserva** el resto de la query (p. ej. `?platform=`). "Todos"
 * quita el filtro.
 */
export function MonthSelect({
  active,
  options,
}: {
  active?: string;
  options: MonthOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("month", value);
    else params.delete("month");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <select
      aria-label="Filtrar gráficas por mes"
      value={active ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="border-border bg-background text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-md border px-2 text-xs outline-none focus-visible:ring-3"
    >
      <option value="">Todos los meses</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
