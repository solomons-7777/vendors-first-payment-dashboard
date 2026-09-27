import { Banknote, Clock, FileWarning, Gauge, Layers } from "lucide-react";
import { StatTile } from "@/components/ui/StatTile";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { BarChartCard } from "@/components/charts/BarChartCard";
import { formatCurrency, formatDays, formatNumber, formatPercent } from "@/lib/format";
import type { ExecutiveSummaryRow, InvoiceRiskRow, Metrics } from "@/lib/types";

interface Props {
  summary: ExecutiveSummaryRow[];
  riskRows: InvoiceRiskRow[];
  metrics: Metrics;
}

export function ExecutiveSummaryTab({ summary, riskRows, metrics }: Props) {
  const transactions = riskRows.length;
  const avgLag =
    riskRows.reduce((sum, r) => sum + r["Processing Lag (d)"], 0) / (transactions || 1);
  const avgRisk =
    riskRows.reduce((sum, r) => sum + r["Risk Percentile"], 0) / (transactions || 1);
  const totalObligation = riskRows.reduce((sum, r) => sum + r["Obligation ($)"], 0);
  const totalPenalty = riskRows.reduce((sum, r) => sum + r["Estimated Penalty"], 0);

  const columns: DataTableColumn<ExecutiveSummaryRow>[] = [
    { key: "County", header: "County", render: (r) => r.County },
    {
      key: "Transactions",
      header: "Transactions",
      align: "right",
      render: (r) => formatNumber(r.Transactions),
    },
    {
      key: "Avg_Lag",
      header: "Avg. Lag",
      align: "right",
      render: (r) => formatDays(r.Avg_Lag),
    },
    {
      key: "Avg_Risk_Percentile",
      header: "Avg. Risk",
      align: "right",
      render: (r) => formatPercent(r.Avg_Risk_Percentile),
    },
    {
      key: "Total_Obligation",
      header: "Obligations",
      align: "right",
      render: (r) => formatCurrency(r.Total_Obligation),
    },
    {
      key: "Total_Penalty",
      header: "Est. Penalty",
      align: "right",
      render: (r) => formatCurrency(r.Total_Penalty),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Transactions" value={formatNumber(transactions)} icon={<Layers size={16} />} />
        <StatTile label="Average lag" value={formatDays(avgLag)} icon={<Clock size={16} />} />
        <StatTile label="Average risk" value={formatPercent(avgRisk)} icon={<Gauge size={16} />} />
        <StatTile label="Obligations" value={formatCurrency(totalObligation)} icon={<Banknote size={16} />} />
        <StatTile
          label="Est. penalty"
          value={formatCurrency(totalPenalty)}
          tone="critical"
          icon={<FileWarning size={16} />}
        />
      </div>

      <p className="text-xs text-text-muted">
        Model accuracy {formatPercent(metrics.accuracy, 0)} · ROC AUC{" "}
        {metrics.roc_auc === null ? "—" : metrics.roc_auc.toFixed(2)} on the held-out
        test split.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarChartCard
          title="Average processing lag by county (days)"
          data={summary.map((r) => ({ label: r.County, value: r.Avg_Lag }))}
          valueFormatter={(v) => v.toFixed(0)}
        />
        <BarChartCard
          title="Estimated cashflow penalty by county"
          data={summary.map((r) => ({ label: r.County, value: r.Total_Penalty }))}
          valueFormatter={formatCurrency}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border-strong bg-surface">
        <div className="border-b border-border-strong px-5 py-4">
          <h3 className="text-sm font-semibold text-text-primary">County summary</h3>
        </div>
        <DataTable columns={columns} rows={summary} getRowKey={(r) => r.County} />
      </div>
    </div>
  );
}
