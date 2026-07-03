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
import { formatCount, formatDate } from "@/core/lib/format";
import { weekday } from "@/core/lib/datetime";
import type { TikTokOverview, TikTokReadResult, VideoRow } from "@/modules/tiktok/read";

function ConnectButton({ label }: { label: string }) {
  return (
    <Link href="/api/auth/tiktok/login" className={buttonVariants()}>
      {label}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}

function VideoTableRow({ row }: { row: VideoRow }) {
  const { video, metrics } = row;
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">
        <div>{formatDate(video.publishedAt)}</div>
        <div className="text-muted-foreground text-xs capitalize">
          {weekday(video.publishedAt)}
        </div>
      </TableCell>
      <TableCell className="max-w-xs">
        <p className="truncate text-sm">{video.caption ?? "—"}</p>
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
      <TableCell className="text-right tabular-nums">
        {formatCount(metrics?.views ?? null)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatCount(metrics?.likes ?? null)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatCount(metrics?.comments ?? null)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatCount(metrics?.shares ?? null)}
      </TableCell>
    </TableRow>
  );
}

function Overview({ overview }: { overview: TikTokOverview }) {
  const { account, videos } = overview;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Seguidores" value={formatCount(account.followers)} />
        <Stat label="Likes totales" value={formatCount(account.totalLikes)} />
        <Stat label="Videos cargados" value={String(videos.length)} />
      </div>

      {videos.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No se encontraron videos en esta cuenta.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Publicado</TableHead>
              <TableHead>Descripción / hashtags</TableHead>
              <TableHead className="text-right">Vistas</TableHead>
              <TableHead className="text-right">Likes</TableHead>
              <TableHead className="text-right">Comentarios</TableHead>
              <TableHead className="text-right">Compartidos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.map((row) => (
              <VideoTableRow key={row.video.externalId} row={row} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export function TikTokPanel({ result }: { result: TikTokReadResult }) {
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
          <p className="text-sm text-red-600 dark:text-red-400">
            No se pudieron leer los datos: {result.message}
          </p>
          <ConnectButton label="Reconectar TikTok" />
        </div>
      );
    case "ok":
      return <Overview overview={result.overview} />;
  }
}
