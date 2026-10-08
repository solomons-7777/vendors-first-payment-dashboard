import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { BarChartCard } from "@/components/charts/BarChartCard";
import { formatPercent } from "@/lib/format";
import type { FeatureImportanceRow } from "@/lib/types";

const CHART_LIMIT = 10;

export function FeatureImportanceTab({ rows }: { rows: FeatureImportanceRow[] }) {
  const sorted = [...rows].sort((a, b) => b.Importance - a.Importance);
  const top = sorted.slice(0, CHART_LIMIT);

  const columns: DataTableColumn<FeatureImportanceRow>[] = [
    { key: "Feature", header: "Feature", render: (r) => r.Feature },
    {
      key: "Importance",
      header: "Importance",
      align: "right",
      render: (r) => formatPercent(r.Importance, 1),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <BarChartCard
        title={`Top ${Math.min(CHART_LIMIT, sorted.length)} structural drivers of late payments`}
        data={top.map((r) => ({ label: r.Feature, value: r.Importance }))}
        valueFormatter={(v) => formatPercent(v, 0)}
        height={Math.max(220, top.length * 32)}
      />
      <div className="overflow-hidden rounded-lg border border-border-strong bg-surface">
        <div className="border-b border-border-strong px-5 py-4">
          <h3 className="text-sm font-semibold text-text-primary">
            All model features ({sorted.length})
          </h3>
        </div>
        <DataTable columns={columns} rows={sorted} getRowKey={(r) => r.Feature} />
      </div>
    </div>
  );
}
