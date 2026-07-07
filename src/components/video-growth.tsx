import {
  GrowthLineChart,
  type GrowthPoint,
  type GrowthSeries,
} from "@/components/charts/growth-line-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCount, formatDate } from "@/core/lib/format";
import { CREATOR_TIMEZONE as TZ } from "@/modules/analytics/insights";
import type { VideoHistoryPoint } from "@/modules/analytics/history";
import {
  DEFAULT_AGE_DAYS,
  initialVelocity,
  toAgePoints,
  viewsAtAge,
} from "@/modules/analytics/timeseries";

const SERIES: GrowthSeries[] = [
  { key: "views", label: "Vistas", color: "var(--color-chart-1)" },
  { key: "likes", label: "Likes", color: "var(--color-chart-2)" },
];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded-lg border p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${formatCount(value)}`;
}

/**
 * Crecimiento de un video en el tiempo, reconstruido de sus `video_snapshots`.
 * Necesita ≥2 capturas para dibujar la curva; el cron captura una al día.
 */
export function VideoGrowth({
  points,
  publishedAt,
}: {
  points: VideoHistoryPoint[];
  publishedAt: Date;
}) {
  const first = points[0];
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const gainedTotal = first && last ? last.views - first.views : 0;
  const lastDelta = prev && last ? last.views - prev.views : 0;

  const agePoints = toAgePoints(
    publishedAt,
    points.map((p) => ({ capturedAt: new Date(p.capturedAt), views: p.views })),
  );
  const velocity = initialVelocity(agePoints);
  const viewsAt7 = viewsAtAge(agePoints, DEFAULT_AGE_DAYS);

  const chartData: GrowthPoint[] = points.map((p) => ({
    date: formatDate(new Date(p.capturedAt), TZ),
    views: p.views,
    likes: p.likes,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Crecimiento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {points.length < 2 ? (
          <p className="text-muted-foreground text-sm">
            Aún no hay suficiente historia para este video. El cron guarda un
            snapshot al día — vuelve en unos días para ver la curva.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Vistas ganadas" value={signed(gainedTotal)} />
              <Stat label="Último periodo" value={signed(lastDelta)} />
              <Stat label="Capturas" value={String(points.length)} />
            </div>
            {(velocity !== null || viewsAt7 !== null) && (
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label="Velocidad inicial"
                  value={velocity !== null ? `${formatCount(velocity)}/día` : "—"}
                />
                <Stat
                  label={`Vistas a ${DEFAULT_AGE_DAYS} días`}
                  value={viewsAt7 !== null ? formatCount(viewsAt7) : "—"}
                />
              </div>
            )}
            <GrowthLineChart data={chartData} series={SERIES} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
