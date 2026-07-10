import Link from "next/link";
import type { Platform } from "@/core/domain";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCount, formatDate, formatPercent, formatTime } from "@/core/lib/format";
import { weekday } from "@/core/lib/datetime";
import {
  CREATOR_TIMEZONE as TZ,
  engagementRate,
  type VideoWithMetrics,
} from "@/modules/analytics/insights";

const PLATFORM_META: Record<Platform, { label: string; dotVar: string }> = {
  tiktok: { label: "TikTok", dotVar: "var(--color-platform-tiktok)" },
  instagram: { label: "Instagram", dotVar: "var(--color-platform-instagram)" },
};

/** Badge compacto de plataforma (punto con el acento por plataforma + label). */
function PlatformBadge({ platform }: { platform: Platform }) {
  const meta = PLATFORM_META[platform];
  return (
    <Badge variant="outline" className="gap-1.5 whitespace-nowrap">
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: meta.dotVar }}
        aria-hidden
      />
      {meta.label}
    </Badge>
  );
}

function Row({ row }: { row: VideoWithMetrics }) {
  const { video, metrics } = row;
  // Platform-aware: cada fila enlaza al detalle de SU plataforma.
  const href = `/video/${video.platform}/${video.externalId}`;
  return (
    <TableRow>
      <TableCell>
        <Link href={href}>
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- CDN de la plataforma con URL firmada
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
      <TableCell>
        <PlatformBadge platform={video.platform} />
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
          <p className="truncate text-sm">{video.caption ?? "—"}</p>
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
      <TableCell className="text-right tabular-nums">
        {formatPercent(engagementRate(metrics))}
      </TableCell>
    </TableRow>
  );
}

/**
 * Listado cross-platform de videos con métricas (server-safe). Cada fila enlaza
 * al detalle de su plataforma (`/video/{platform}/{id}`). Ordena por vistas desc.
 * Lo consumen las vistas que mezclan plataformas (p. ej. /content); los paneles
 * por plataforma conservan sus tablas propias (columnas Dur./Guard. específicas).
 */
export function VideoListTable({ rows }: { rows: VideoWithMetrics[] }) {
  const sorted = [...rows].sort((a, b) => b.metrics.views - a.metrics.views);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead />
          <TableHead>Plataforma</TableHead>
          <TableHead>Publicado</TableHead>
          <TableHead>Descripción / hashtags</TableHead>
          <TableHead className="text-right">Vistas</TableHead>
          <TableHead className="text-right">Likes</TableHead>
          <TableHead className="text-right">Coment.</TableHead>
          <TableHead className="text-right">Comp.</TableHead>
          <TableHead className="text-right">Engmt.</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <Row key={`${row.video.platform}-${row.video.externalId}`} row={row} />
        ))}
      </TableBody>
    </Table>
  );
}
