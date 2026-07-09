import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RangeSelect } from "@/components/dashboard/range-select";
import {
  InsightBarChart,
  type InsightDatum,
} from "@/components/charts/insight-bar-chart";
import { getSession } from "@/modules/tiktok/session";
import { readTikTokOverview } from "@/modules/tiktok/read";
import { resolveRange, sinceForRange } from "@/modules/tiktok/ranges";
import {
  bestBucket,
  engagementRate,
  summarize,
  topHashtags,
  viewsByHour,
  viewsByWeekday,
} from "@/modules/analytics/insights";
import { formatCount, formatPercent } from "@/core/lib/format";
import type { VideoWithMetrics } from "@/modules/analytics/insights";

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-card shadow-card rounded-lg border p-4">
      <div className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        {label}
      </div>
      <div className="font-display mt-1.5 text-2xl font-semibold tabular-nums">
        {value}
      </div>
      <div className="bg-primary mt-2 h-0.5 w-7 rounded-full" />
      {hint && <div className="text-muted-foreground mt-1.5 text-xs">{hint}</div>}
    </div>
  );
}

function RecentVideos({ videos }: { videos: VideoWithMetrics[] }) {
  return (
    <div className="divide-y">
      {videos.slice(0, 6).map(({ video, metrics }) => (
        <Link
          key={video.externalId}
          href={`/video/tiktok/${video.externalId}`}
          className="hover:bg-muted/40 flex items-center gap-3 px-1 py-2 transition-colors"
        >
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- CDN de TikTok con URL firmada
            <img
              src={video.thumbnailUrl}
              alt=""
              width={32}
              height={42}
              referrerPolicy="no-referrer"
              className="h-11 w-8 rounded object-cover"
            />
          ) : (
            <div className="bg-muted h-11 w-8 rounded" />
          )}
          <p className="min-w-0 flex-1 truncate text-sm">{video.caption ?? "—"}</p>
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {formatCount(metrics.views)} vistas
          </span>
          <span className="shrink-0 text-xs tabular-nums">
            {formatPercent(engagementRate(metrics))}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = resolveRange(rangeParam);
  const session = await getSession();
  const result = await readTikTokOverview(session, {
    since: sinceForRange(range),
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-wide">Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Rendimiento y crecimiento de tus videos.
          </p>
        </div>
        <RangeSelect active={range} />
      </header>

      {result.status !== "ok" ? (
        <Card>
          <CardHeader>
            <CardTitle>Conecta una cuenta para ver métricas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {result.status === "expired"
                ? "La sesión de TikTok expiró. Vuelve a conectarla."
                : result.status === "error"
                  ? `No se pudieron leer los datos: ${result.message}`
                  : "Aún no hay ninguna cuenta conectada."}
            </p>
            <Link href="/api/auth/tiktok/login" className={buttonVariants()}>
              {result.status === "disconnected" ? "Conectar TikTok" : "Reconectar TikTok"}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <OverviewContent overview={result.overview} />
      )}
    </div>
  );
}

function OverviewContent({
  overview,
}: {
  overview: { account: import("@/core/domain").AccountStats; videos: VideoWithMetrics[] };
}) {
  const { account, videos } = overview;
  const summary = summarize(videos);
  const bestDay = bestBucket(viewsByWeekday(videos));
  const bestHour = bestBucket(viewsByHour(videos));

  const weekdayData: InsightDatum[] = viewsByWeekday(videos).map((b) => ({
    label: b.label.slice(0, 3),
    value: Math.round(b.avgViews),
    highlight: b.label === bestDay?.label,
  }));
  const hashtagData: InsightDatum[] = topHashtags(videos, 8).map((h) => ({
    label: `#${h.tag}`,
    value: h.totalViews,
  }));

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Vistas totales" value={formatCount(summary.totalViews)} />
        <Kpi label="Seguidores" value={formatCount(account.followers)} />
        <Kpi
          label="Engagement prom."
          value={formatPercent(summary.avgEngagement)}
        />
        <Kpi
          label="Videos"
          value={formatCount(summary.totalVideos)}
          hint={bestDay ? `Mejor día: ${capitalize(bestDay.label)}` : undefined}
        />
      </section>

      {videos.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No hay videos en este periodo. Prueba con un rango más amplio.
        </p>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Vistas promedio por día
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InsightBarChart data={weekdayData} valueLabel="vistas prom." />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Top hashtags por vistas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InsightBarChart
                  data={hashtagData}
                  valueLabel="vistas"
                  orientation="vertical"
                />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <Kpi
              label="Mejor día"
              value={bestDay ? capitalize(bestDay.label) : "—"}
              hint={bestDay ? `${formatCount(Math.round(bestDay.avgViews))} vistas prom.` : undefined}
            />
            <Kpi
              label="Mejor hora"
              value={bestHour ? bestHour.label : "—"}
              hint={bestHour ? `${formatCount(Math.round(bestHour.avgViews))} vistas prom.` : undefined}
            />
            <Kpi
              label="Vistas promedio"
              value={formatCount(Math.round(summary.avgViews))}
            />
          </section>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-sm">Videos recientes</CardTitle>
              <Link
                href="/tiktok"
                className="text-primary text-xs hover:underline"
              >
                Ver todos
              </Link>
            </CardHeader>
            <CardContent>
              <RecentVideos videos={videos} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
