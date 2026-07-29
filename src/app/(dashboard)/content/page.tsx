import Link from "next/link";
import { MoveLeftIcon } from "@animateicons/react/lucide";
import type { Platform } from "@/core/domain";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlatformFilter } from "@/components/dashboard/platform-filter";
import { StatCard } from "@/components/dashboard/stat-card";
import { VideoListTable } from "@/components/dashboard/video-list-table";
import { readGrowth } from "@/modules/analytics/history";
import {
  groupByContentType,
  summarize,
  type VideoWithMetrics,
} from "@/modules/analytics/insights";
import {
  classifyContentType,
  contentHref,
  contentTypeLabel,
  CONTENT_TYPES,
  UNCLASSIFIED_PARAM,
  type ContentTypeKey,
} from "@/core/lib/content-type";
import { formatCount, formatPercent } from "@/core/lib/format";

/** Parsea `?type=` a una clave válida (o `null` = sin clasificar, undefined = resumen). */
function parseTypeParam(
  raw: string | undefined,
): ContentTypeKey | null | undefined {
  if (!raw) return undefined;
  if (raw === UNCLASSIFIED_PARAM) return null;
  return raw in CONTENT_TYPES ? (raw as ContentTypeKey) : undefined;
}

/** Alias local del KPI compartido. */
const Stat = StatCard;

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; platform?: string }>;
}) {
  const { type: typeParam, platform: platformParam } = await searchParams;
  const platform: Platform | undefined =
    platformParam === "tiktok" || platformParam === "instagram"
      ? platformParam
      : undefined;
  const type = parseTypeParam(typeParam);

  const { videos } = await readGrowth({ platform });
  const byType = groupByContentType(videos);

  const inDrilldown = type !== undefined;
  const drillRows: VideoWithMetrics[] = inDrilldown
    ? videos.filter((v) => classifyContentType(v.video.hashtags) === type)
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {inDrilldown && (
            <Link
              href={platform ? `/content?platform=${platform}` : "/content"}
              className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm"
            >
              <MoveLeftIcon size={16} /> Contenido
            </Link>
          )}
          <h1 className="text-[1.9rem] font-medium tracking-[-0.025em]">
            {inDrilldown ? contentTypeLabel(type) : "Contenido"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {inDrilldown
              ? "Videos de este tipo, con su métrica vigente."
              : "Tu catálogo dividido por tipo de contenido (hashtag identificador)."}
          </p>
        </div>
        <PlatformFilter
          active={platform}
          basePath="/content"
          extraQuery={{ type: typeParam }}
        />
      </header>

      {videos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay videos guardados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              El cron guarda snapshots a diario; vuelve cuando haya capturas.
            </p>
          </CardContent>
        </Card>
      ) : !inDrilldown ? (
        /* ── Resumen: una card por tipo (solo grupos con videos) ── */
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* `byType` viene ordenado por vistas promedio desc: el primero es el
              formato que mejor rinde, así que se destaca en lima. */}
          {byType.map((t, i) => {
            const lead = i === 0;
            return (
              <Link
                key={t.label}
                href={contentHref(t.key, platform)}
                className={
                  lead
                    ? "bg-primary text-primary-foreground shadow-card hover:shadow-lift relative block overflow-hidden rounded-lg p-5 transition-shadow duration-200"
                    : "bg-card shadow-card hover:shadow-lift block rounded-lg p-5 transition-shadow duration-200"
                }
              >
                {lead && (
                  <div className="bg-halftone pointer-events-none absolute inset-0" />
                )}
                <div className="relative flex items-baseline justify-between gap-2">
                  <h2 className="font-medium">{t.label}</h2>
                  <span
                    className={`font-mono text-xs tabular-nums ${lead ? "text-foreground/60" : "text-muted-foreground"}`}
                  >
                    {t.count} {t.count === 1 ? "video" : "videos"}
                  </span>
                </div>
                <div className="relative mt-3 text-[2.4rem] leading-none font-medium tracking-[-0.03em] tabular-nums">
                  {formatCount(Math.round(t.avgViews))}
                </div>
                <div
                  className={`relative text-sm ${lead ? "text-foreground/60" : "text-muted-foreground"}`}
                >
                  vistas promedio
                </div>
                <dl
                  className={`relative mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-xs ${lead ? "border-foreground/15 text-foreground/60" : "text-muted-foreground"}`}
                >
                  <div>
                    <dt>Vistas totales</dt>
                    <dd
                      className={`font-mono tabular-nums ${lead ? "text-primary-foreground" : "text-foreground"}`}
                    >
                      {formatCount(t.totalViews)}
                    </dd>
                  </div>
                  <div>
                    <dt>Engagement prom.</dt>
                    <dd
                      className={`font-mono tabular-nums ${lead ? "text-primary-foreground" : "text-foreground"}`}
                    >
                      {formatPercent(t.avgEngagement)}
                    </dd>
                  </div>
                </dl>
              </Link>
            );
          })}
        </section>
      ) : drillRows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {type ? `Sin videos de "${contentTypeLabel(type)}"` : "Nada sin clasificar"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {type
                ? `Etiqueta tus videos con #${CONTENT_TYPES[type].tags[0]} para que aparezcan aquí.`
                : "Todos los videos del catálogo ya tienen tag de tipo."}
            </p>
          </CardContent>
        </Card>
      ) : (
        /* ── Drill-down: overview del grupo + listado ── */
        <DrilldownContent rows={drillRows} />
      )}
    </div>
  );
}

function DrilldownContent({ rows }: { rows: VideoWithMetrics[] }) {
  const s = summarize(rows);
  const best = s.bestVideo;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="accent" label="Videos" value={formatCount(s.totalVideos)} />
        <Stat label="Vistas totales" value={formatCount(s.totalViews)} />
        <Stat
          label="Vistas promedio"
          value={formatCount(Math.round(s.avgViews))}
        />
        <Stat label="Engagement prom." value={formatPercent(s.avgEngagement)} />
      </section>

      {best && (
        <p className="text-muted-foreground text-sm">
          Mejor video:{" "}
          <Link
            href={`/video/${best.video.platform}/${best.video.externalId}`}
            className="text-primary hover:underline"
          >
            {best.video.caption ?? best.video.externalId}
          </Link>{" "}
          — {formatCount(best.metrics.views)} vistas
        </p>
      )}

      <VideoListTable rows={rows} />
    </div>
  );
}
