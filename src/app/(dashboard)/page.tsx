import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PeriodNav } from "@/components/dashboard/period-nav";
import { formatCount } from "@/core/lib/format";
import { contentHref, type ContentTypeKey } from "@/core/lib/content-type";
import {
  readOverviewSummary,
  type OverviewSummary,
  type SubBucketMetrics,
} from "@/modules/analytics/overview";

/** KPI del periodo: número combinado (Spectral) + split por plataforma (mono). */
function Kpi({
  label,
  combined,
  tiktok,
  instagram,
}: {
  label: string;
  combined: number;
  tiktok: number;
  instagram: number;
}) {
  return (
    <div className="bg-card shadow-card rounded-lg border p-4">
      <div className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        {label}
      </div>
      <div className="font-display mt-1.5 text-2xl font-semibold tabular-nums">
        {formatCount(combined)}
      </div>
      <div className="bg-primary mt-2 h-0.5 w-7 rounded-full" />
      <div className="mt-2 flex gap-3 font-mono text-[11px] tabular-nums">
        <span className="text-platform-tiktok">TT {formatCount(tiktok)}</span>
        <span className="text-platform-instagram">IG {formatCount(instagram)}</span>
      </div>
    </div>
  );
}

const CHART_H = 140;

/** Barras de vistas ganadas por sub-bucket (día o semana), apiladas por plataforma. */
function ViewsBars({ buckets }: { buckets: SubBucketMetrics[] }) {
  const max = Math.max(1, ...buckets.map((b) => Math.max(0, b.combined.views)));
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        {buckets.map((b) => {
          const tk = Math.max(0, b.tiktok.views);
          const ig = Math.max(0, b.instagram.views);
          const total = tk + ig;
          return (
            <div key={b.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="text-muted-foreground h-3 font-mono text-[9px] tabular-nums">
                {total > 0 ? formatCount(total) : ""}
              </div>
              <div
                className="flex w-full flex-col justify-end"
                style={{ height: CHART_H }}
              >
                <div
                  className="bg-platform-tiktok w-full rounded-t-sm"
                  style={{ height: (tk / max) * CHART_H }}
                />
                <div
                  className="bg-platform-instagram w-full"
                  style={{ height: (ig / max) * CHART_H }}
                />
              </div>
              <span className="text-muted-foreground text-[10px]">{b.label}</span>
            </div>
          );
        })}
      </div>
      <div className="text-muted-foreground flex gap-4 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="bg-platform-tiktok size-2 rounded-full" /> TikTok
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-platform-instagram size-2 rounded-full" /> Instagram
        </span>
      </div>
    </div>
  );
}

/** Tipos de contenido publicados en el periodo (link al drill-down de /content). */
function TypeList({ types }: { types: OverviewSummary["contentTypes"] }) {
  const sorted = [...types].sort((a, b) => b.totalViews - a.totalViews);
  return (
    <div className="flex flex-col">
      {sorted.map((t) => (
        <Link
          key={String(t.key)}
          href={contentHref(t.key as ContentTypeKey | null)}
          className="hover:bg-muted/40 flex items-center justify-between rounded px-1 py-2 not-last:border-b transition-colors"
        >
          <span className="text-sm">{t.label}</span>
          <span className="flex items-center gap-3 font-mono text-xs">
            <span className="text-muted-foreground">
              {t.count} video{t.count !== 1 ? "s" : ""}
            </span>
            <span className="tabular-nums">{formatCount(t.totalViews)} vistas</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      {children}
    </div>
  );
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; anchor?: string }>;
}) {
  const sp = await searchParams;
  const granularity = sp.period === "month" ? "month" : "week";

  let summary: OverviewSummary;
  try {
    summary = await readOverviewSummary({ granularity, anchor: sp.anchor });
  } catch (err) {
    return (
      <PageShell>
        <h1 className="font-display text-2xl tracking-wide">Overview</h1>
        <Card>
          <CardContent className="py-6">
            <p className="text-destructive text-sm">
              No se pudo leer el resumen:{" "}
              {err instanceof Error ? err.message : "error desconocido"}
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const { period, combined, byPlatform, subBuckets, contentTypes } = summary;
  const currentAnchor =
    period.granularity === "month" ? `${period.key}-01` : period.key;
  const unit = period.subGranularity === "day" ? "día" : "semana";

  return (
    <PageShell>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-wide">Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Resumen de {period.granularity === "week" ? "la semana" : "el mes"} ·{" "}
            {period.label}
            {combined.followersGained !== null && (
              <>
                {" · "}
                <span className="text-primary font-medium">
                  {combined.followersGained >= 0 ? "+" : ""}
                  {formatCount(combined.followersGained)}
                </span>{" "}
                seguidores
              </>
            )}
          </p>
        </div>
        <PeriodNav
          granularity={period.granularity}
          label={period.label}
          currentAnchor={currentAnchor}
          prevAnchor={period.prevAnchor}
          nextAnchor={period.nextAnchor}
        />
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Videos"
          combined={combined.videosPublished}
          tiktok={byPlatform.tiktok.videosPublished}
          instagram={byPlatform.instagram.videosPublished}
        />
        <Kpi
          label="Vistas"
          combined={combined.views}
          tiktok={byPlatform.tiktok.views}
          instagram={byPlatform.instagram.views}
        />
        <Kpi
          label="Likes"
          combined={combined.likes}
          tiktok={byPlatform.tiktok.likes}
          instagram={byPlatform.instagram.likes}
        />
        <Kpi
          label="Comentarios"
          combined={combined.comments}
          tiktok={byPlatform.tiktok.comments}
          instagram={byPlatform.instagram.comments}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Vistas por {unit}</CardTitle>
          </CardHeader>
          <CardContent>
            <ViewsBars buckets={subBuckets} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tipos de contenido publicados</CardTitle>
          </CardHeader>
          <CardContent>
            {contentTypes.length > 0 ? (
              <TypeList types={contentTypes} />
            ) : (
              <p className="text-muted-foreground text-sm">
                No publicaste videos en este periodo.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
