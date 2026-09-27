"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";

interface BarDatum {
  label: string;
  value: number;
}

interface BarChartCardProps {
  title: string;
  data: BarDatum[];
  valueFormatter?: (value: number) => string;
  height?: number;
}

function ChartTooltip({
  active,
  payload,
  valueFormatter,
}: {
  active?: boolean;
  payload?: { value: number; payload: BarDatum }[];
  valueFormatter: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return (
    <div className="rounded-md border border-border-strong bg-surface px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-text-primary">{datum.label}</div>
      <div className="mt-0.5 text-text-secondary">
        {valueFormatter(datum.value)}
      </div>
    </div>
  );
}

export function BarChartCard({
  title,
  data,
  valueFormatter = (v) => v.toLocaleString(),
  height = 280,
}: BarChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
            barCategoryGap={10}
          >
            <CartesianGrid
              horizontal={false}
              stroke="var(--border-strong)"
              strokeDasharray="0"
            />
            <XAxis
              type="number"
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border-strong)" }}
              tickFormatter={valueFormatter}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-sunken)" }}
              content={<ChartTooltip valueFormatter={valueFormatter} />}
            />
            <Bar
              dataKey="value"
              fill="var(--brand)"
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
