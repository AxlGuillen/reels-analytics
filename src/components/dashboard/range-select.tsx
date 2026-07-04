"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { VIDEO_RANGES, type RangeKey } from "@/modules/tiktok/ranges";

/**
 * Selector de periodo. Enlaza al mismo pathname cambiando `?range=`, de modo que
 * funciona igual en Overview, TikTok, etc. sin acoplarse a una ruta concreta.
 */
export function RangeSelect({ active }: { active: RangeKey }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {VIDEO_RANGES.map((r) => (
        <Link
          key={r.key}
          href={`${pathname}?range=${r.key}`}
          scroll={false}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            r.key === active
              ? "border-transparent bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}
