import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { BarChartCard } from "@/components/charts/BarChartCard";
import { formatCurrency, formatDays, formatNumber, formatPercent } from "@/lib/format";
import type { VendorTargetingRow } from "@/lib/types";

const CHART_LIMIT = 10;

export function VendorTargetingTab({ rows }: { rows: VendorTargetingRow[] }) {
  const sorted = [...rows].sort((a, b) => b.Priority_Score - a.Priority_Score);
  const top = sorted.slice(0, CHART_LIMIT);

  const columns: DataTableColumn<VendorTargetingRow>[] = [
    { key: "Recipient", header: "Recipient", render: (r) => r.Recipient },
    {
      key: "Awards",
      header: "Awards",
      align: "right",
      render: (r) => formatNumber(r.Awards),
    },
    {
      key: "Avg_Obligation",
      header: "Avg. Obligation",
      align: "right",
      render: (r) => formatCurrency(r.Avg_Obligation),
    },
    {
      key: "Avg_Lag",
      header: "Avg. Lag",
      align: "right",
      render: (r) => formatDays(r.Avg_Lag),
    },
    {
      key: "Avg_Model_Risk",
      header: "Avg. Model Risk",
      align: "right",
      render: (r) => formatPercent(r.Avg_Model_Risk),
    },
    {
      key: "Priority_Score",
      header: "Priority Score",
      align: "right",
      render: (r) => r.Priority_Score.toFixed(1),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <BarChartCard
        title="Top vendors by outreach priority score"
        data={top.map((r) => ({ label: r.Recipient, value: r.Priority_Score }))}
        valueFormatter={(v) => v.toFixed(1)}
        height={Math.max(220, top.length * 32)}
      />
      <div className="overflow-hidden rounded-lg border border-border-strong bg-surface">
        <div className="flex items-baseline justify-between border-b border-border-strong px-5 py-4">
          <h3 className="text-sm font-semibold text-text-primary">Vendor targeting</h3>
          <span className="text-xs text-text-muted">
            Ranked by priority score — model risk scaled by award count, size, and lag
          </span>
        </div>
        <DataTable columns={columns} rows={sorted} getRowKey={(r) => r.Recipient} />
      </div>
    </div>
  );
}
