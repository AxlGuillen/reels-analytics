"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCount } from "@/core/lib/format";

export interface InsightDatum {
  label: string;
  value: number;
  /** true = resaltar (p. ej. el mejor día). */
  highlight?: boolean;
}

interface TooltipEntry {
  payload: InsightDatum;
}

function ChartTooltip({
  active,
  payload,
  valueLabel,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  valueLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return (
    <div className="bg-card rounded-md border px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{datum.label}</div>
      <div className="text-muted-foreground">
        {formatCount(datum.value)} {valueLabel}
      </div>
    </div>
  );
}

/**
 * Barras para analítica derivada (mejor día, top hashtags…). Los datos se
 * calculan en el servidor desde `modules/analytics` y llegan ya serializados.
 * `layout="vertical"` = barras horizontales (útil para rankings con etiquetas).
 */
export function InsightBarChart({
  data,
  valueLabel,
  orientation = "horizontal",
  height = 220,
}: {
  data: InsightDatum[];
  valueLabel: string;
  orientation?: "horizontal" | "vertical";
  height?: number;
}) {
  const axisStyle = { fontSize: 11, fill: "var(--color-muted-foreground)" };
  const vertical = orientation === "vertical";

  if (data.length === 0) {
    return (
      <div
        className="text-muted-foreground flex items-center justify-center text-sm"
        style={{ height }}
      >
        Sin datos en este periodo.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={vertical ? "vertical" : "horizontal"}
        margin={{ top: 4, right: 8, bottom: 0, left: vertical ? 8 : 0 }}
      >
        {vertical ? (
          <>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={92}
              tickLine={false}
              axisLine={false}
              tick={axisStyle}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={axisStyle}
            />
            <YAxis
              tickFormatter={(v: number) => formatCount(v)}
              tickLine={false}
              axisLine={false}
              width={40}
              tick={axisStyle}
            />
          </>
        )}
        <Tooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
          content={<ChartTooltip valueLabel={valueLabel} />}
        />
        <Bar dataKey="value" radius={4}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.highlight ? "var(--color-chart-2)" : "var(--color-chart-1)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
