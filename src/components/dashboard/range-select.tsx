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
    <div className="border-border bg-card divide-border inline-flex divide-x overflow-hidden rounded-md border">
      {VIDEO_RANGES.map((r) => (
        <Link
          key={r.key}
          href={`${pathname}?range=${r.key}`}
          scroll={false}
          aria-current={r.key === active ? "true" : undefined}
          className={cn(
            "px-3 py-1.5 text-xs transition-colors",
            r.key === active
              ? "bg-foreground text-background font-medium"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}
