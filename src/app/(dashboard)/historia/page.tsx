import type { Metadata } from "next";
import { GitCommitHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageTour } from "@/components/tour/page-tour";
import { MCP_TOOLS } from "@/modules/mcp/catalog";
import {
  formatMilestoneDate,
  REPO_URL,
  TIMELINE,
  timelineStats,
} from "./timeline-data";

export const metadata: Metadata = { title: "Historia" };

/**
 * La historia del proyecto como pantalla del panel: hitos curados del git log
 * (ver timeline-data.ts), agrupados en capítulos sobre un riel vertical. Los
 * hitos clave llevan punto y chip lima (jerarquía por tono); cada hito enlaza
 * a su commit real en GitHub. Página estática: sin BD, sin loading.tsx.
 */
export default function HistoriaPage() {
  const stats = timelineStats();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 md:px-8">
      <header data-tour="historia-header">
        <h1 className="text-[1.9rem] font-medium tracking-[-0.025em]">
          La historia
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cómo nació la idea y qué se fue estrenando, hito por hito — cada uno
          enlaza a su commit real.
        </p>
      </header>

      <div
        data-tour="historia-stats"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <StatCard
          tone="accent"
          label="Días construyendo"
          value={String(stats.days)}
          hint="desde el 2 de julio"
        />
        <StatCard
          label="Hitos"
          value={String(stats.milestones)}
          hint="destilados del git log"
        />
        <StatCard
          label="Tools MCP"
          value={String(MCP_TOOLS.length)}
          hint="de solo lectura"
        />
        <StatCard label="Plataformas" value="2" hint="TikTok e Instagram" />
      </div>

      <div data-tour="historia-linea" className="space-y-10">
        {TIMELINE.map((chapter, index) => (
          <section key={chapter.id}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-muted-foreground font-mono text-[11px]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="text-xl font-medium tracking-[-0.025em]">
                {chapter.title}
              </h2>
              <span className="text-muted-foreground ml-auto font-mono text-[11px] uppercase">
                {chapter.period}
              </span>
            </div>
            <p className="text-muted-foreground mt-2 max-w-[68ch] text-sm leading-[1.55]">
              {chapter.intro}
            </p>

            <ol className="border-border mt-6 ml-[5px] border-l">
              {chapter.milestones.map((m) => (
                <li key={`${m.date}-${m.title}`} className="relative pb-7 pl-7 last:pb-1">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-[3px] left-0 size-[11px] -translate-x-1/2 rounded-full",
                      m.tag
                        ? "bg-primary ring-primary/25 ring-4"
                        : "bg-border ring-background ring-2",
                    )}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">
                      {formatMilestoneDate(m.date)}
                    </span>
                    {m.tag && (
                      <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-[3px] text-[10px] font-semibold tracking-wider uppercase">
                        {m.tag}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 text-[15px] font-medium tracking-[-0.01em]">
                    {m.title}
                  </h3>
                  <p className="text-muted-foreground mt-1 max-w-[62ch] text-sm leading-[1.55]">
                    {m.description}
                  </p>
                  {m.sha && (
                    <a
                      href={`${REPO_URL}/commit/${m.sha}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] font-mono text-[11px] transition-colors"
                    >
                      <GitCommitHorizontal className="size-3" aria-hidden />
                      {m.sha}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <footer className="text-muted-foreground text-sm">
        La historia sigue escribiéndose — el repo es{" "}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline underline-offset-2 hover:no-underline"
        >
          público
        </a>
        .
      </footer>

      <PageTour route="/historia" />
    </div>
  );
}
