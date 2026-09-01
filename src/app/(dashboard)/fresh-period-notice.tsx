import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

/**
 * Aviso de "periodo recién empezado": cuando el periodo mostrado es el actual
 * y todavía no hay deltas (solo existe una captura del cron), el Overview
 * pintaba puros ceros sin explicación — parecía roto. Este banner dice por qué
 * y ofrece saltar al periodo anterior, que sí tiene datos completos.
 * Sin `data-tour` a propósito (anchors.test.ts rechaza anclas muertas).
 */
export function FreshPeriodNotice({
  granularity,
  prevAnchor,
}: {
  granularity: "week" | "month";
  prevAnchor: string;
}) {
  const week = granularity === "week";
  return (
    <div className="bg-card shadow-card mb-3.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg p-[18px]">
      <div className="flex items-start gap-3">
        <span className="bg-muted text-muted-foreground flex size-[26px] shrink-0 items-center justify-center rounded-[9px]">
          <Clock className="size-3.5" />
        </span>
        <div>
          <p className="text-[13.5px] font-medium">
            {week ? "La semana acaba de empezar" : "El mes acaba de empezar"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[12.5px] leading-[1.5]">
            Las métricas se calculan comparando capturas del cron y por ahora
            solo hay una: los primeros números llegan con la captura de mañana
            (~8:00 am).
          </p>
        </div>
      </div>
      <Link
        href={`/?period=${granularity}&anchor=${prevAnchor}`}
        className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-medium transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        {week ? "Ver semana pasada" : "Ver mes anterior"}
      </Link>
    </div>
  );
}
