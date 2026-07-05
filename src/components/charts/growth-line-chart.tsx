"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCount } from "@/core/lib/format";

export interface GrowthSeries {
  key: string;
  label: string;
  /** color CSS (usar var(--color-chart-*)). */
  color: string;
}

/** Punto ya mergeado: una fecha con un valor por serie (`key` → número|null). */
export type GrowthPoint = { date: string } & Record<string, number | string | null>;

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card rounded-md border px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="ml-auto tabular-nums">{formatCount(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Líneas de crecimiento en el tiempo (una por serie/plataforma). */
export function GrowthLineChart({
  data,
  series,
  height = 260,
}: {
  data: GrowthPoint[];
  series: GrowthSeries[];
  height?: number;
}) {
  const axisStyle = { fontSize: 11, fill: "var(--color-muted-foreground)" };

  if (data.length === 0) {
    return (
      <div
        className="text-muted-foreground flex items-center justify-center text-sm"
        style={{ height }}
      >
        Aún no hay suficiente historia. Vuelve en unos días.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={axisStyle}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={(v: number) => formatCount(v)}
          tickLine={false}
          axisLine={false}
          width={44}
          tick={axisStyle}
        />
        <Tooltip content={<ChartTooltip />} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
