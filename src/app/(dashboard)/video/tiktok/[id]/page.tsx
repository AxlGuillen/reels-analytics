import { notFound } from "next/navigation";
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
import { readVideoBenchmark } from "@/modules/analytics/breakouts";
import { StatCard } from "@/components/dashboard/stat-card";
import { VideoGrowth } from "@/components/video-growth";
import { PageTour } from "@/components/tour/page-tour";
import { queryVideos } from "@/modules/tiktok/api";
import { toVideo, toVideoMetrics } from "@/modules/tiktok/mappers";
import { resolveTikTokAuthForVideo } from "@/modules/accounts/tokens";

/** Alias local del KPI compartido. */
const Stat = StatCard;

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
  // Token de la cuenta DUEÑA del video: la Display API no deja leer un video
  // ajeno, así que uno de una cuenta secundaria necesita el token de esa cuenta.
  const auth = await resolveTikTokAuthForVideo(id);

  if (auth.status !== "ok") {
    return (
      <PageShell>
        <p className="text-muted-foreground text-sm">
          {auth.status === "expired"
            ? "La conexión de TikTok de esta cuenta venció. Reconéctala desde Conexiones."
            : "TikTok no está conectado. Conéctalo desde Conexiones."}
        </p>
      </PageShell>
    );
  }

  let raw;
  try {
    const results = await queryVideos(auth.accessToken, [id]);
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

  // 404 real (status + página con marca) en vez de un 200 con mensaje plano.
  if (!raw) notFound();

  const video = toVideo(raw);
  const metrics = toVideoMetrics(raw);
  const history = await readVideoHistory("tiktok", id);
  // El benchmark es azúcar: si falla o no hay cohorte, la página sigue.
  const benchmark = await readVideoBenchmark("tiktok", id).catch(() => null);

  return (
    <PageShell>
      <div data-tour="video-info" className="flex flex-col gap-6 sm:flex-row">
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
            <h1 className="text-[1.9rem] font-medium tracking-[-0.025em]">Detalle del video</h1>
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

      <div data-tour="video-stats" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat tone="accent" label="Vistas" value={formatCount(metrics.views)} />
        <Stat label="Likes" value={formatCount(metrics.likes)} />
        <Stat label="Comentarios" value={formatCount(metrics.comments)} />
        <Stat label="Compartidos" value={formatCount(metrics.shares)} />
        <Stat label="Engagement" value={formatPercent(engagementRate(metrics))} />
      </div>

      <div data-tour="video-curva">
        <VideoGrowth
          points={history}
          publishedAt={video.publishedAt}
          benchmark={benchmark}
        />
      </div>
      <PageTour route="/video" />
    </PageShell>
  );
}
