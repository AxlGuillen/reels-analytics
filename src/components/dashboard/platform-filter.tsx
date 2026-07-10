import Link from "next/link";
import type { Platform } from "@/core/domain";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILTERS: { label: string; value?: Platform }[] = [
  { label: "Todas" },
  { label: "TikTok", value: "tiktok" },
  { label: "Instagram", value: "instagram" },
];

/**
 * Chips de filtro por plataforma (server-safe). Enlaza a `basePath` con
 * `?platform=` y preserva los pares de `extraQuery` (p. ej. `type` en /content).
 */
export function PlatformFilter({
  active,
  basePath,
  extraQuery = {},
}: {
  active?: Platform;
  basePath: string;
  extraQuery?: Record<string, string | undefined>;
}) {
  function hrefFor(value?: Platform): string {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(extraQuery)) {
      if (val) params.set(key, val);
    }
    if (value) params.set("platform", value);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex gap-1">
      {FILTERS.map((f) => (
        <Link
          key={f.label}
          href={hrefFor(f.value)}
          className={cn(
            buttonVariants({
              variant: active === f.value ? "default" : "outline",
              size: "sm",
            }),
          )}
        >
          {f.label}
        </Link>
      ))}
    </div>
  );
}
