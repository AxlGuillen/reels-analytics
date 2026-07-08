import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccountStats } from "@/core/domain";
import {
  formatCount,
  formatDate,
  formatPercent,
  formatTime,
} from "@/core/lib/format";
import { weekday } from "@/core/lib/datetime";
import {
  bestBucket,
  engagementRate,
  summarize,
  topHashtags,
  viewsByHour,
  viewsByWeekday,
  CREATOR_TIMEZONE as TZ,
  type VideoWithMetrics,
} from "@/modules/analytics/insights";
import type {
  InstagramOverview,
  InstagramReadResult,
} from "@/modules/instagram/read";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card shadow-card rounded-lg border p-4">
      <div className="font-mono text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}

function AccountHeader({ account }: { account: AccountStats }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {account.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- CDN de Instagram con URL firmada
          <img
            src={account.avatarUrl}
            alt={account.displayName ?? "avatar"}
            width={56}
            height={56}
            referrerPolicy="no-referrer"
            className="size-14 rounded-full object-cover"
          />
        )}
        <div>
          <div className="font-semibold">{account.displayName ?? "—"}</div>
          {account.handle && (
            <div className="text-muted-foreground text-sm">@{account.handle}</div>
          )}
        </div>
      </div>
      {account.bio && <p className="text-muted-foreground text-sm">{account.bio}</p>}
    </div>
  );
}

function InsightCharts({ videos }: { videos: VideoWithMetrics[] }) {
  const bestDay = bestBucket(viewsByWeekday(videos));
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
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Vistas promedio por día</CardTitle>
        </CardHeader>
        <CardContent>
          <InsightBarChart data={weekdayData} valueLabel="vistas prom." />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top hashtags por vistas</CardTitle>
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
  );
}

function VideoTableRow({
  row,
  breakout,
}: {
  row: VideoWithMetrics;
  breakout?: boolean;
}) {
  const { video, metrics } = row;
  const href = `/video/instagram/${video.externalId}`;
  return (
    <TableRow>
      <TableCell>
        <Link href={href}>
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- CDN de Instagram con URL firmada
            <img
              src={video.thumbnailUrl}
              alt=""
              width={44}
              height={58}
              referrerPolicy="no-referrer"
              className="h-14 w-10 rounded object-cover"
            />
          ) : (
            <div className="bg-muted h-14 w-10 rounded" />
          )}
        </Link>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <div>{formatDate(video.publishedAt, TZ)}</div>
        <div className="text-muted-foreground text-xs">
          <span className="capitalize">{weekday(video.publishedAt, TZ)}</span> ·{" "}
          {formatTime(video.publishedAt, TZ)}
        </div>
      </TableCell>
      <TableCell className="max-w-xs">
        <Link href={href} className="hover:underline">
          <p className="truncate text-sm">
            {breakout && (
              <Badge className="border-transparent bg-primary/15 text-primary mr-1.5 align-middle">
                Breakout
              </Badge>
            )}
            {video.caption ?? "—"}
          </p>
        </Link>
        {video.hashtags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {video.hashtags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(metrics.views)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(metrics.likes)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(metrics.comments)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(metrics.shares)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(metrics.saved)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatPercent(engagementRate(metrics))}
      </TableCell>
    </TableRow>
  );
}

function Overview({
  overview,
  breakouts,
}: {
  overview: InstagramOverview;
  breakouts?: Set<string>;
}) {
  const { account, videos } = overview;
  const summary = summarize(videos);
  const bestDay = bestBucket(viewsByWeekday(videos));
  const bestHour = bestBucket(viewsByHour(videos));

  return (
    <div className="space-y-8">
      <AccountHeader account={account} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Seguidores" value={formatCount(account.followers)} />
        <Stat label="Siguiendo" value={formatCount(account.following ?? null)} />
        <Stat label="Vistas totales" value={formatCount(summary.totalViews)} />
        <Stat label="Reels" value={formatCount(summary.totalVideos)} />
      </section>

      {videos.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No hay Reels en este periodo. Prueba con un rango más amplio.
        </p>
      ) : (
        <>
          <InsightCharts videos={videos} />

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Mejor día" value={bestDay ? capitalize(bestDay.label) : "—"} />
            <Stat label="Mejor hora" value={bestHour ? bestHour.label : "—"} />
            <Stat
              label="Vistas promedio"
              value={formatCount(Math.round(summary.avgViews))}
            />
            <Stat label="Engagement prom." value={formatPercent(summary.avgEngagement)} />
          </section>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Reels ({videos.length})</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>Publicado</TableHead>
                  <TableHead>Descripción / hashtags</TableHead>
                  <TableHead className="text-right">Vistas</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Coment.</TableHead>
                  <TableHead className="text-right">Comp.</TableHead>
                  <TableHead className="text-right">Guard.</TableHead>
                  <TableHead className="text-right">Engmt.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((row) => (
                  <VideoTableRow
                    key={row.video.externalId}
                    row={row}
                    breakout={breakouts?.has(row.video.externalId)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

export function InstagramPanel({
  result,
  breakouts,
}: {
  result: InstagramReadResult;
  breakouts?: Set<string>;
}) {
  switch (result.status) {
    case "disconnected":
      return (
        <p className="text-muted-foreground text-sm">
          Falta configurar <code>INSTAGRAM_ACCESS_TOKEN</code> en el entorno para
          leer tus Reels.
        </p>
      );
    case "error":
      return (
        <p className="text-destructive text-sm">
          No se pudieron leer los datos: {result.message}
        </p>
      );
    case "ok":
      return <Overview overview={result.overview} breakouts={breakouts} />;
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
