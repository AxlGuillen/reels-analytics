import Link from "next/link";
import type { Platform } from "@/core/domain";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  InsightBarChart,
  type InsightDatum,
} from "@/components/charts/insight-bar-chart";
import {
  GrowthLineChart,
  type GrowthPoint,
  type GrowthSeries,
} from "@/components/charts/growth-line-chart";
import { MonthSelect } from "@/components/dashboard/month-select";
import {
  MetricToggle,
  type MetricMode,
} from "@/components/dashboard/metric-toggle";
import { PlatformFilter } from "@/components/dashboard/platform-filter";
import {
  readGrowth,
  readSnapshotSeries,
  readVideoSeries,
  type AccountSeries,
} from "@/modules/analytics/history";
import { DEFAULT_AGE_DAYS, viewsAtAge } from "@/modules/analytics/timeseries";
import {
  bestBucket,
  captionStats,
  CREATOR_TIMEZONE,
  gainedByMonth,
  groupByContentType,
  postingCadence,
  summarize,
  topHashtags,
  videosByPublishMonth,
  viewsByDuration,
  viewsByHour,
  viewsByWeekday,
} from "@/modules/analytics/insights";
import {
  attributeFollowers,
  dailyFollowerDeltas,
  type FollowerDelta,
} from "@/modules/analytics/attribution";
import { contentHref, RESERVED_TAGS } from "@/core/lib/content-type";
import { monthKey } from "@/core/lib/datetime";
import { formatCount, formatDate, formatPercent } from "@/core/lib/format";

/** Mínimo de videos para que un mes sea elegible como "mejor engagement". */
const ENGAGEMENT_MIN_VIDEOS = 5;

/** Elige el elemento con el mayor valor según `sel` (o undefined si está vacío). */
function maxBy<T>(items: T[], sel: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>(
    (best, item) => (!best || sel(item) > sel(best) ? item : best),
    undefined,
  );
}

const PLATFORM_COLORS: Record<Platform, string> = {
  tiktok: "var(--color-platform-tiktok)",
  instagram: "var(--color-platform-instagram)",
};

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
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

/** Delta de seguidores de los últimos `days` días (o null si no hay historia). */
function followerDelta(series: AccountSeries, days: number): number | null {
  const points = series.points.filter((p) => p.followers !== null);
  if (points.length < 2) return null;
  const latest = points[points.length - 1];
  const cutoff = new Date(latest.capturedAt).getTime() - days * 86_400_000;
  const past = [...points]
    .reverse()
    .find((p) => new Date(p.capturedAt).getTime() <= cutoff);
  if (!past) return null;
  return (latest.followers ?? 0) - (past.followers ?? 0);
}

function signed(value: number | null): string {
  if (value === null) return "—";
  return value >= 0 ? `+${formatCount(value)}` : formatCount(value);
}

/** Mergea las series por día calendario (una columna por plataforma). */
function mergeSeries(seriesList: AccountSeries[]): {
  data: GrowthPoint[];
  series: GrowthSeries[];
} {
  const byDay = new Map<string, Record<string, number | null>>();
  for (const s of seriesList) {
    for (const point of s.points) {
      const day = point.capturedAt.slice(0, 10);
      const row = byDay.get(day) ?? {};
      row[s.platform] = point.followers; // última captura del día gana
      byDay.set(day, row);
    }
  }
  const data: GrowthPoint[] = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, values]) => ({
      date: formatDate(new Date(`${day}T00:00:00Z`), "UTC"),
      ...values,
    }));

  const series: GrowthSeries[] = seriesList
    .filter((s) => s.points.some((p) => p.followers !== null))
    .map((s) => ({
      key: s.platform,
      label: `@${s.handle ?? s.platform}`,
      color: PLATFORM_COLORS[s.platform],
    }));

  return { data, series };
}

export default async function GrowthPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; month?: string; metric?: string }>;
}) {
  const {
    platform: platformParam,
    month: monthParam,
    metric: metricParam,
  } = await searchParams;
  const metric: MetricMode = metricParam === "age7" ? "age7" : "total";
  const platform: Platform | undefined =
    platformParam === "tiktok" || platformParam === "instagram"
      ? platformParam
      : undefined;

  const { videos, accountSeries } = await readGrowth({ platform });
  const { data: growthData, series: growthSeries } = mergeSeries(accountSeries);

  const byType = groupByContentType(videos);
  const byMonth = videosByPublishMonth(videos);
  const cadence = postingCadence(videos);
  const summary = summarize(videos);

  // Atribución de seguidores: deltas diarios por plataforma × ventana de cada video.
  const deltasByPlatform = new Map<Platform, FollowerDelta[]>(
    accountSeries.map((s) => [
      s.platform,
      dailyFollowerDeltas(
        s.points.map((p) => ({
          capturedAt: new Date(p.capturedAt),
          followers: p.followers,
        })),
      ),
    ]),
  );
  const attributed = attributeFollowers(videos, deltasByPlatform)
    .filter((a) => a.gained > 0)
    .slice(0, 8);

  // Quick wins: momentum del catálogo, duración (solo TikTok) y caption.
  const momentum = gainedByMonth(await readSnapshotSeries({ platform }));
  const momentumData: InsightDatum[] = momentum.map((m) => ({
    label: m.label,
    value: m.gained,
  }));
  const durationBuckets = viewsByDuration(videos);
  const durationCount = durationBuckets.reduce((sum, b) => sum + b.count, 0);
  const captions = captionStats(videos);

  // Destacados del bloque mensual.
  const monthMostViews = maxBy(byMonth, (m) => m.totalViews);
  const monthMostVideos = maxBy(byMonth, (m) => m.count);
  const monthBestEngagement = maxBy(
    byMonth.filter((m) => m.count >= ENGAGEMENT_MIN_VIDEOS),
    (m) => m.avgEngagement,
  );
  // Gráfica mensual (cronológica: byMonth viene nuevo-primero).
  const monthViewsData: InsightDatum[] = [...byMonth].reverse().map((m) => ({
    label: m.label,
    value: m.totalViews,
    highlight: m.month === monthMostViews?.month,
  }));

  // Filtro por mes: acota SOLO las gráficas de día/hashtags.
  const monthOptions = byMonth.map((m) => ({ value: m.month, label: m.label }));
  const month =
    monthParam && monthOptions.some((o) => o.value === monthParam)
      ? monthParam
      : undefined;
  const activeMonthLabel = month
    ? monthOptions.find((o) => o.value === month)?.label
    : undefined;
  const videosForCharts = month
    ? videos.filter((v) => monthKey(v.video.publishedAt, CREATOR_TIMEZONE) === month)
    : videos;

  // Normalización por edad: reemplaza las vistas de por vida por las vistas a 7
  // días (comparación justa). Los videos sin historia temprana se excluyen.
  const viewsAt7 = new Map(
    (metric === "age7" ? await readVideoSeries({ platform }) : []).map((s) => [
      s.externalId,
      viewsAtAge(s.points, DEFAULT_AGE_DAYS),
    ]),
  );
  const chartRows =
    metric === "age7"
      ? videosForCharts.flatMap((r) => {
          const v = viewsAt7.get(r.video.externalId);
          return v == null ? [] : [{ ...r, metrics: { ...r.metrics, views: v } }];
        })
      : videosForCharts;

  const weekdayBuckets = viewsByWeekday(chartRows);
  const bestDay = bestBucket(weekdayBuckets);
  const hourBuckets = viewsByHour(chartRows);
  const bestHour = bestBucket(hourBuckets);

  const weekdayData: InsightDatum[] = weekdayBuckets.map((b) => ({
    label: b.label.slice(0, 3),
    value: Math.round(b.avgViews),
    highlight: b.label === bestDay?.label,
  }));
  const hashtagData: InsightDatum[] = topHashtags(chartRows, 8, RESERVED_TAGS).map(
    (h) => ({
      label: `#${h.tag}`,
      value: h.totalViews,
    }),
  );

  const monthSuffix = activeMonthLabel ? ` — ${activeMonthLabel}` : "";

  const empty = videos.length === 0 && growthData.length === 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-wide">Crecimiento</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Historia acumulada desde los snapshots guardados.
          </p>
        </div>
        <PlatformFilter
          active={platform}
          basePath="/growth"
          extraQuery={{ month: monthParam, metric: metricParam }}
        />
      </header>

      {empty ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay datos guardados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              El cron guarda un snapshot al día. Vuelve en unos días para ver el
              crecimiento acumulado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Crecimiento de cuenta */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {accountSeries.map((s) => (
              <Kpi
                key={s.platform}
                label={`Seguidores @${s.handle ?? s.platform}`}
                value={formatCount(
                  s.points.filter((p) => p.followers !== null).at(-1)?.followers ?? null,
                )}
                hint={`${signed(followerDelta(s, 7))} 7d · ${signed(followerDelta(s, 30))} 30d`}
              />
            ))}
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Seguidores en el tiempo</CardTitle>
            </CardHeader>
            <CardContent>
              <GrowthLineChart data={growthData} series={growthSeries} />
            </CardContent>
          </Card>

          {/* Atribución de seguidores */}
          {attributed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Videos que coinciden con seguidores nuevos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground text-xs">
                  Seguidores ganados por la cuenta en la ventana de publicación
                  (día del post + siguiente). Correlación, no causalidad: el
                  delta es de toda la cuenta.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Video</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Publicado</TableHead>
                      <TableHead className="text-right">Seguidores</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attributed.map(({ row, gained, sharedWindow }) => (
                      <TableRow key={`${row.video.platform}-${row.video.externalId}`}>
                        <TableCell className="max-w-xs">
                          <Link
                            href={`/video/${row.video.platform}/${row.video.externalId}`}
                            className="hover:underline"
                          >
                            <p className="truncate text-sm">
                              {row.video.caption ?? "—"}
                            </p>
                          </Link>
                          {sharedWindow && (
                            <span className="text-muted-foreground text-xs">
                              ventana compartida con otro video
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">
                          {row.video.platform}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(row.video.publishedAt, CREATOR_TIMEZONE)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          +{formatCount(gained)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Rendimiento por tipo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Rendimiento por tipo de video</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Videos</TableHead>
                    <TableHead className="text-right">Vistas prom.</TableHead>
                    <TableHead className="text-right">Vistas totales</TableHead>
                    <TableHead className="text-right">Engagement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byType.map((t) => (
                    <TableRow key={t.label}>
                      <TableCell className="font-medium">
                        <Link
                          href={contentHref(t.key, platform)}
                          className="hover:text-primary hover:underline"
                        >
                          {t.label}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{t.count}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCount(Math.round(t.avgViews))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCount(t.totalViews)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(t.avgEngagement)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Destacados por mes */}
          <section className="grid gap-3 sm:grid-cols-3">
            <Kpi
              label="Mes con más vistas"
              value={monthMostViews ? monthMostViews.label : "—"}
              hint={
                monthMostViews
                  ? `${formatCount(monthMostViews.totalViews)} vistas`
                  : undefined
              }
            />
            <Kpi
              label="Mes con más videos"
              value={monthMostVideos ? monthMostVideos.label : "—"}
              hint={monthMostVideos ? `${monthMostVideos.count} videos` : undefined}
            />
            <Kpi
              label="Mejor engagement"
              value={monthBestEngagement ? monthBestEngagement.label : "—"}
              hint={
                monthBestEngagement
                  ? `${formatPercent(monthBestEngagement.avgEngagement)} · ${monthBestEngagement.count} videos`
                  : `sin meses con ≥${ENGAGEMENT_MIN_VIDEOS} videos`
              }
            />
          </section>

          {/* Bloque mensual: gráfica + tabla */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Por mes de publicación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <InsightBarChart data={monthViewsData} valueLabel="vistas" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Videos</TableHead>
                    <TableHead className="text-right">Vistas</TableHead>
                    <TableHead className="text-right">Comentarios</TableHead>
                    <TableHead className="text-right">Engagement prom.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byMonth.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{m.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.count}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCount(m.totalViews)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCount(m.totalComments)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(m.avgEngagement)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Momentum: vistas ganadas por mes (deltas de snapshots) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Momentum del catálogo — vistas ganadas por mes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground text-xs">
                Suma de los deltas entre snapshots: cuánto creció TODO tu
                contenido cada mes (no solo lo publicado ese mes). Empieza a
                contar desde que arrancó la ingesta.
              </p>
              <InsightBarChart data={momentumData} valueLabel="vistas ganadas" />
            </CardContent>
          </Card>

          {/* Cadencia + KPIs */}
          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Espaciado entre publicaciones → vistas prom.
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gap desde el post anterior</TableHead>
                      <TableHead className="text-right">Videos</TableHead>
                      <TableHead className="text-right">Vistas prom.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cadence.map((c) => (
                      <TableRow key={c.label}>
                        <TableCell className="font-medium">{c.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.count}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCount(Math.round(c.avgViews))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3 content-start">
              <Kpi label="Videos" value={formatCount(summary.totalVideos)} />
              <Kpi label="Vistas totales" value={formatCount(summary.totalViews)} />
              <Kpi
                label="Mejor día"
                value={bestDay ? bestDay.label : "—"}
                hint={bestDay ? `${formatCount(Math.round(bestDay.avgViews))} vistas prom.` : undefined}
              />
              <Kpi
                label="Mejor hora"
                value={bestHour ? bestHour.label : "—"}
                hint={bestHour ? `${formatCount(Math.round(bestHour.avgViews))} vistas prom.` : undefined}
              />
              <Kpi
                label="Engagement ponderado"
                value={formatPercent(summary.weightedEngagement)}
                hint={`prom. simple: ${formatPercent(summary.avgEngagement)}`}
              />
            </div>
          </section>

          {/* Formato y caption */}
          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Duración → vistas prom.</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground text-xs">
                  Solo TikTok expone la duración ({durationCount} videos
                  considerados; Instagram no la da).
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Duración</TableHead>
                      <TableHead className="text-right">Videos</TableHead>
                      <TableHead className="text-right">Vistas prom.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {durationBuckets.map((b) => (
                      <TableRow key={b.label}>
                        <TableCell className="font-medium">{b.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{b.count}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCount(Math.round(b.avgViews))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Caption → vistas prom.</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground text-xs">
                  Sobre el texto antes de los hashtags. Correlación, no
                  causalidad.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Característica</TableHead>
                      <TableHead className="text-right">Videos</TableHead>
                      <TableHead className="text-right">Vistas prom.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {captions.map((c) => (
                      <TableRow key={c.label}>
                        <TableCell className="font-medium">{c.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.count}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCount(Math.round(c.avgViews))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          {/* Hashtags / día — filtrables por mes */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs">
                {metric === "age7"
                  ? `Vistas a ${DEFAULT_AGE_DAYS} días — ${chartRows.length} de ${videosForCharts.length} videos con historia temprana`
                  : activeMonthLabel
                    ? `Gráficas filtradas: ${activeMonthLabel} (${videosForCharts.length} videos)`
                    : "Gráficas sobre todos los meses"}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <MetricToggle active={metric} />
                <MonthSelect active={month} options={monthOptions} />
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Vistas promedio por día{monthSuffix}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InsightBarChart data={weekdayData} valueLabel="vistas prom." />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Top hashtags por vistas{monthSuffix}
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
            </div>
          </section>
        </>
      )}
    </div>
  );
}
