import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AccountStats } from "@/core/domain";
import {
  formatCount,
  formatDate,
  formatDuration,
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
import type { TikTokOverview, TikTokReadResult } from "@/modules/tiktok/read";

function ConnectButton({ label }: { label: string }) {
  return (
    <Link href="/api/auth/tiktok/login" className={buttonVariants()}>
      {label}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded-lg border p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}

function AccountHeader({ account }: { account: AccountStats }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {account.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- CDN de TikTok con URL firmada; next/image la optimizaría y expiraría
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
          <div className="flex items-center gap-2">
            <span className="font-semibold">{account.displayName ?? "—"}</span>
            {account.verified && <Badge variant="secondary">verificado</Badge>}
          </div>
          {account.handle && (
            <div className="text-muted-foreground text-sm">@{account.handle}</div>
          )}
        </div>
      </div>
      {account.bio && <p className="text-muted-foreground text-sm">{account.bio}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Seguidores" value={formatCount(account.followers)} />
        <Stat label="Siguiendo" value={formatCount(account.following ?? null)} />
        <Stat label="Likes totales" value={formatCount(account.totalLikes)} />
        <Stat label="Videos" value={formatCount(account.videoCount ?? null)} />
      </div>
    </div>
  );
}

function InsightsSection({ videos }: { videos: VideoWithMetrics[] }) {
  const summary = summarize(videos);
  const bestDay = bestBucket(viewsByWeekday(videos));
  const bestHour = bestBucket(viewsByHour(videos));
  const hashtags = topHashtags(videos, 8);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Analítica del periodo</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Mejor día" value={bestDay ? capitalize(bestDay.label) : "—"} />
        <Stat label="Mejor hora" value={bestHour ? bestHour.label : "—"} />
        <Stat label="Vistas promedio" value={formatCount(Math.round(summary.avgViews))} />
        <Stat label="Engagement prom." value={formatPercent(summary.avgEngagement)} />
      </div>

      {hashtags.length > 0 && (
        <div className="rounded-lg border p-4">
          <div className="text-muted-foreground mb-3 text-sm">
            Top hashtags (por vistas totales)
          </div>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((h) => (
              <span
                key={h.tag}
                className="bg-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm"
                title={`${h.count} videos · ${formatCount(Math.round(h.avgViews))} vistas prom.`}
              >
                #{h.tag}
                <span className="text-muted-foreground tabular-nums">
                  {formatCount(h.totalViews)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
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
  const href = `/video/tiktok/${video.externalId}`;
  return (
    <TableRow>
      <TableCell>
        <Link href={href}>
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- CDN de TikTok con URL firmada
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
      <TableCell className="text-muted-foreground text-right text-xs tabular-nums">
        {formatDuration(video.durationSeconds)}
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(metrics.views)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(metrics.likes)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(metrics.comments)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCount(metrics.shares)}</TableCell>
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
  overview: TikTokOverview;
  breakouts?: Set<string>;
}) {
  const { account, videos } = overview;
  return (
    <div className="space-y-8">
      <AccountHeader account={account} />

      {videos.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No hay videos en este periodo. Prueba con un rango más amplio.
        </p>
      ) : (
        <>
          <InsightsSection videos={videos} />
          <div>
            <h3 className="mb-3 text-sm font-semibold">Videos ({videos.length})</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>Publicado</TableHead>
                  <TableHead>Descripción / hashtags</TableHead>
                  <TableHead className="text-right">Dur.</TableHead>
                  <TableHead className="text-right">Vistas</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Coment.</TableHead>
                  <TableHead className="text-right">Comp.</TableHead>
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

export function TikTokPanel({
  result,
  breakouts,
}: {
  result: TikTokReadResult;
  breakouts?: Set<string>;
}) {
  switch (result.status) {
    case "disconnected":
      return (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Conecta tu cuenta de TikTok para empezar a leer métricas.
          </p>
          <ConnectButton label="Conectar TikTok" />
        </div>
      );
    case "expired":
      return (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            La sesión expiró. Vuelve a conectar tu cuenta.
          </p>
          <ConnectButton label="Reconectar TikTok" />
        </div>
      );
    case "error":
      return (
        <div className="space-y-3">
          <p className="text-destructive text-sm">
            No se pudieron leer los datos: {result.message}
          </p>
          <ConnectButton label="Reconectar TikTok" />
        </div>
      );
    case "ok":
      return <Overview overview={result.overview} breakouts={breakouts} />;
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
