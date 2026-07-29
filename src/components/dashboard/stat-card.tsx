import { cn } from "@/lib/utils";

/**
 * Tono de una card de métrica. El sistema Acid Grid pide que una rejilla de KPIs
 * NO sea toda del mismo tono: el primero (o el más relevante) va en `accent`
 * (lima) o `dark` para que la jerarquía se lea de un vistazo.
 */
export type StatTone = "plain" | "accent" | "dark";

const TONE: Record<StatTone, string> = {
  plain: "bg-card shadow-card",
  accent: "bg-primary text-primary-foreground shadow-card",
  dark: "bg-foreground text-background shadow-lift",
};

/**
 * Reparte tonos sobre una lista de KPIs: el primero acentuado, el resto planos.
 * Centraliza la regla para que todas las vistas destaquen igual.
 */
export function toneFor(index: number, highlight: StatTone = "accent"): StatTone {
  return index === 0 ? highlight : "plain";
}

/** Card de métrica: cifra grande en grotesca + etiqueta tenue. */
export function StatCard({
  label,
  value,
  hint,
  tone = "plain",
  icon,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
  icon?: React.ReactNode;
  className?: string;
}) {
  const onColor = tone !== "plain";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg p-[18px]",
        TONE[tone],
        className,
      )}
    >
      {onColor && (
        <div className="bg-halftone pointer-events-none absolute inset-0" />
      )}
      <div className="relative flex items-center gap-2.5">
        {icon && (
          <span
            className={cn(
              "flex size-[26px] items-center justify-center rounded-[9px]",
              tone === "plain"
                ? "bg-muted text-muted-foreground"
                : tone === "accent"
                  ? "bg-foreground/10"
                  : "bg-background/10",
            )}
          >
            {icon}
          </span>
        )}
        <span
          className={cn(
            "text-[10px] font-semibold tracking-wider uppercase",
            tone === "plain"
              ? "text-muted-foreground"
              : tone === "accent"
                ? "text-foreground/60"
                : "text-background/60",
          )}
        >
          {label}
        </span>
      </div>
      <div className="relative mt-3 text-[2rem] leading-none font-medium tracking-[-0.03em] tabular-nums">
        {value}
      </div>
      {hint && (
        <div
          className={cn(
            "relative mt-2 text-xs",
            tone === "plain"
              ? "text-muted-foreground"
              : tone === "accent"
                ? "text-foreground/60"
                : "text-background/60",
          )}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
