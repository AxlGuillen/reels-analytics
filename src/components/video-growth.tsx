import {
  GrowthLineChart,
  type GrowthPoint,
  type GrowthSeries,
} from "@/components/charts/growth-line-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCount, formatDate } from "@/core/lib/format";
import { CREATOR_TIMEZONE as TZ } from "@/modules/analytics/insights";
import type { VideoHistoryPoint } from "@/modules/analytics/history";

const SERIES: GrowthSeries[] = [
  { key: "views", label: "Vistas", color: "var(--color-chart-1)" },
  { key: "likes", label: "Likes", color: "var(--color-chart-2)" },
];

function Delta({ label, value }: { label: string; value: number }) {
  const sign = value > 0 ? "+" : "";
  return (
    <div className="bg-muted/30 rounded-lg border p-4">
      <div className="text-2xl font-semibold tabular-nums">
        {sign}
        {formatCount(value)}
      </div>
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}

/**
 * Crecimiento de un video en el tiempo, reconstruido de sus `video_snapshots`.
 * Necesita ≥2 capturas para dibujar la curva; el cron captura una al día.
 */
export function VideoGrowth({ points }: { points: VideoHistoryPoint[] }) {
  const first = points[0];
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const gainedTotal = first && last ? last.views - first.views : 0;
  const lastDelta = prev && last ? last.views - prev.views : 0;

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
              <Delta label="Vistas ganadas" value={gainedTotal} />
              <Delta label="Último periodo" value={lastDelta} />
              <div className="bg-muted/30 rounded-lg border p-4">
                <div className="text-2xl font-semibold tabular-nums">
                  {points.length}
                </div>
                <div className="text-muted-foreground text-sm">Capturas</div>
              </div>
            </div>
            <GrowthLineChart data={chartData} series={SERIES} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
