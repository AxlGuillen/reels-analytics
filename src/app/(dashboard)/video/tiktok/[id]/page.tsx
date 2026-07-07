import Link from "next/link";
import { MoveLeftIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  formatCount,
  formatDateTime,
  formatDuration,
  formatPercent,
} from "@/core/lib/format";
import { weekday } from "@/core/lib/datetime";
import { CREATOR_TIMEZONE as TZ, engagementRate } from "@/modules/analytics/insights";
import { readVideoHistory } from "@/modules/analytics/history";
import { VideoGrowth } from "@/components/video-growth";
import { queryVideos } from "@/modules/tiktok/api";
import { toVideo, toVideoMetrics } from "@/modules/tiktok/mappers";
import { getSession, isExpired } from "@/modules/tiktok/session";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded-lg border p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 md:px-8">
      <Link
        href="/tiktok"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <MoveLeftIcon size={16} /> TikTok
      </Link>
      {children}
    </div>
  );
}

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  if (!session || isExpired(session)) {
    return (
      <PageShell>
        <p className="text-muted-foreground text-sm">
          Sesión no disponible. Vuelve a conectar TikTok desde Conexiones.
        </p>
      </PageShell>
    );
  }

  let raw;
  try {
    const results = await queryVideos(session.accessToken, [id]);
    raw = results[0];
  } catch (err) {
    return (
      <PageShell>
        <p className="text-destructive text-sm">
          Error al leer el video: {err instanceof Error ? err.message : "desconocido"}
        </p>
      </PageShell>
    );
  }

  if (!raw) {
    return (
      <PageShell>
        <p className="text-muted-foreground text-sm">Video no encontrado.</p>
      </PageShell>
    );
  }

  const video = toVideo(raw);
  const metrics = toVideoMetrics(raw);
  const history = await readVideoHistory("tiktok", id);

  return (
    <PageShell>
      <div className="flex flex-col gap-6 sm:flex-row">
        {video.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- CDN de TikTok con URL firmada
          <img
            src={video.thumbnailUrl}
            alt=""
            width={180}
            height={240}
            referrerPolicy="no-referrer"
            className="shrink-0 self-center rounded-lg object-cover sm:self-start"
          />
        )}
        <div className="space-y-4">
          <div>
            <h1 className="font-display text-2xl tracking-wide">Detalle del video</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Publicado el {formatDateTime(video.publishedAt, TZ)} (
              <span className="capitalize">{weekday(video.publishedAt, TZ)}</span>) ·
              zona {TZ}
            </p>
            <p className="text-muted-foreground text-sm">
              Duración {formatDuration(video.durationSeconds)}
            </p>
          </div>

          {video.caption && <p className="text-sm">{video.caption}</p>}

          {video.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {video.hashtags.map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {video.url && (
            <Link
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline" })}
            >
              Ver en TikTok ↗
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Vistas" value={formatCount(metrics.views)} />
        <Stat label="Likes" value={formatCount(metrics.likes)} />
        <Stat label="Comentarios" value={formatCount(metrics.comments)} />
        <Stat label="Compartidos" value={formatCount(metrics.shares)} />
        <Stat label="Engagement" value={formatPercent(engagementRate(metrics))} />
      </div>

      <VideoGrowth points={history} publishedAt={video.publishedAt} />
    </PageShell>
  );
}
