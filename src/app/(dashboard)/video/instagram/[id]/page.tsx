import Link from "next/link";
import { MoveLeftIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatCount, formatDateTime, formatPercent } from "@/core/lib/format";
import { weekday } from "@/core/lib/datetime";
import { CREATOR_TIMEZONE as TZ, engagementRate } from "@/modules/analytics/insights";
import { readVideoHistory } from "@/modules/analytics/history";
import { readVideoBenchmark } from "@/modules/analytics/breakouts";
import { VideoGrowth } from "@/components/video-growth";
import { readInstagramVideo } from "@/modules/instagram/read";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card shadow-card rounded-lg border p-4">
      <div className="font-display text-2xl font-semibold tabular-nums">{value}</div>
      <div className="bg-primary my-2 h-0.5 w-7 rounded-full" />
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 md:px-8">
      <Link
        href="/instagram"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <MoveLeftIcon size={16} /> Instagram
      </Link>
      {children}
    </div>
  );
}

export default async function InstagramVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await readInstagramVideo(id);

  if (result.status === "disconnected") {
    return (
      <PageShell>
        <p className="text-muted-foreground text-sm">
          Falta configurar el acceso a Instagram para leer este Reel.
        </p>
      </PageShell>
    );
  }
  if (result.status === "error") {
    return (
      <PageShell>
        <p className="text-destructive text-sm">
          Error al leer el Reel: {result.message}
        </p>
      </PageShell>
    );
  }

  const { video, metrics } = result.row;
  const history = await readVideoHistory("instagram", id);
  // El benchmark es azúcar: si falla o no hay cohorte, la página sigue.
  const benchmark = await readVideoBenchmark("instagram", id).catch(() => null);

  return (
    <PageShell>
      <div className="flex flex-col gap-6 sm:flex-row">
        {video.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- CDN de Instagram con URL firmada
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
            <h1 className="font-display text-2xl tracking-wide">Detalle del Reel</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Publicado el {formatDateTime(video.publishedAt, TZ)} (
              <span className="capitalize">{weekday(video.publishedAt, TZ)}</span>) ·
              zona {TZ}
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
              Ver en Instagram ↗
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Vistas" value={formatCount(metrics.views)} />
        <Stat label="Likes" value={formatCount(metrics.likes)} />
        <Stat label="Comentarios" value={formatCount(metrics.comments)} />
        <Stat label="Compartidos" value={formatCount(metrics.shares)} />
        <Stat label="Guardados" value={formatCount(metrics.saved)} />
        <Stat label="Engagement" value={formatPercent(engagementRate(metrics))} />
      </div>

      <VideoGrowth
        points={history}
        publishedAt={video.publishedAt}
        benchmark={benchmark}
      />
    </PageShell>
  );
}
