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
import { VideoListTable } from "@/components/dashboard/video-list-table";
import { readGrowth } from "@/modules/analytics/history";
import {
  groupByContentType,
  summarize,
  type VideoWithMetrics,
} from "@/modules/analytics/insights";
import {
  classifyContentType,
  contentTypeLabel,
  CONTENT_TYPES,
  UNCLASSIFIED_LABEL,
  type ContentTypeKey,
} from "@/core/lib/content-type";
import { formatCount, formatPercent } from "@/core/lib/format";

/** Valor del query param para el grupo sin tag de tipo (la clave real es `null`). */
const UNCLASSIFIED_PARAM = "unclassified";

/** Parsea `?type=` a una clave válida (o `null` = sin clasificar, undefined = resumen). */
function parseTypeParam(
  raw: string | undefined,
): ContentTypeKey | null | undefined {
  if (!raw) return undefined;
  if (raw === UNCLASSIFIED_PARAM) return null;
  return raw in CONTENT_TYPES ? (raw as ContentTypeKey) : undefined;
}

function typeHref(key: ContentTypeKey | null, platform?: Platform): string {
  const params = new URLSearchParams();
  params.set("type", key ?? UNCLASSIFIED_PARAM);
  if (platform) params.set("platform", platform);
  return `/content?${params.toString()}`;
}

/** KPI editorial del ledger: número Spectral + subrayado teal + label. */
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-card shadow-card rounded-lg border p-4">
      <div className="font-display text-2xl font-semibold tabular-nums">{value}</div>
      <div className="bg-primary my-2 h-0.5 w-7 rounded-full" />
      <div className="text-muted-foreground text-sm">{label}</div>
      {hint && <div className="text-muted-foreground mt-0.5 text-xs">{hint}</div>}
    </div>
  );
}

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
          <h1 className="font-display text-2xl tracking-wide">
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
          {byType.map((t) => (
            <Link
              key={t.label}
              href={typeHref(t.key, platform)}
              className="bg-card shadow-card hover:shadow-lift block rounded-lg border p-5 transition-shadow duration-200"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">{t.label}</h2>
                <span className="text-muted-foreground font-mono text-xs tabular-nums">
                  {t.count} {t.count === 1 ? "video" : "videos"}
                </span>
              </div>
              <div className="font-display mt-3 text-3xl font-semibold tabular-nums">
                {formatCount(Math.round(t.avgViews))}
              </div>
              <div className="bg-primary my-2 h-0.5 w-7 rounded-full" />
              <div className="text-muted-foreground text-sm">vistas promedio</div>
              <dl className="text-muted-foreground mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                <div>
                  <dt>Vistas totales</dt>
                  <dd className="text-foreground font-mono tabular-nums">
                    {formatCount(t.totalViews)}
                  </dd>
                </div>
                <div>
                  <dt>Engagement prom.</dt>
                  <dd className="text-foreground font-mono tabular-nums">
                    {formatPercent(t.avgEngagement)}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </section>
      ) : drillRows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Sin videos {type ? `de "${contentTypeLabel(type)}"` : "sin clasificar"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {type
                ? `Etiqueta tus videos con #${CONTENT_TYPES[type].tag} para que aparezcan aquí.`
                : `Todos los videos tienen tag de tipo. (${UNCLASSIFIED_LABEL} queda vacío.)`}
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
        <Stat label="Videos" value={formatCount(s.totalVideos)} />
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
