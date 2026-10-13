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
  const promptPayDays = 30;
  const transactions = riskRows.length;
  const avgLag =
    riskRows.reduce((sum, r) => sum + r["Processing Lag (d)"], 0) / (transactions || 1);
  const avgRisk =
    riskRows.reduce((sum, r) => sum + r["Risk Percentile"], 0) / (transactions || 1);
  const totalObligation = riskRows.reduce((sum, r) => sum + r["Obligation ($)"], 0);
  const totalPenalty = riskRows.reduce((sum, r) => sum + r["Estimated Penalty"], 0);
  const overdueRows = riskRows.filter((r) => r["Processing Lag (d)"] > promptPayDays);
  const onTimeRate = transactions ? (transactions - overdueRows.length) / transactions : 0;
  const outstandingFor = (row: InvoiceRiskRow) =>
    Math.max(row["Obligation ($)"] - row["Outlay ($)"], 0);
  const pendingRows = riskRows.filter((r) => outstandingFor(r) > 0.005);
  const outstandingBalance = pendingRows.reduce((sum, r) => sum + outstandingFor(r), 0);
  const overdueOutstanding = overdueRows.reduce((sum, r) => sum + outstandingFor(r), 0);
  const aging = [
    {
      label: "0–30 days",
      value: riskRows.filter((r) => r["Processing Lag (d)"] <= 30).length,
    },
    {
      label: "31–60 days",
      value: riskRows.filter(
        (r) => r["Processing Lag (d)"] > 30 && r["Processing Lag (d)"] <= 60
      ).length,
    },
    {
      label: "61–90 days",
      value: riskRows.filter(
        (r) => r["Processing Lag (d)"] > 60 && r["Processing Lag (d)"] <= 90
      ).length,
    },
    {
      label: "90+ days",
      value: riskRows.filter((r) => r["Processing Lag (d)"] > 90).length,
    },
  ];

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Transactions" value={formatNumber(transactions)} icon={<Layers size={16} />} />
        <StatTile
          label="On-time payment rate"
          value={formatPercent(onTimeRate)}
          sublabel={`Completed within ${promptPayDays} days`}
          tone={onTimeRate >= 0.8 ? "good" : "warning"}
          icon={<Gauge size={16} />}
        />
        <StatTile
          label="Overdue payments"
          value={formatNumber(overdueRows.length)}
          sublabel={`${formatCurrency(overdueOutstanding)} still outstanding`}
          tone={overdueRows.length > 0 ? "critical" : "good"}
          icon={<FileWarning size={16} />}
        />
        <StatTile
          label="Pending payments"
          value={formatNumber(pendingRows.length)}
          sublabel={`${formatCurrency(outstandingBalance)} obligation not outlayed`}
          tone={pendingRows.length > 0 ? "warning" : "good"}
          icon={<Banknote size={16} />}
        />
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

      <p className="text-xs leading-5 text-text-muted">
        On-time and overdue use the current 30-day prompt-payment standard. Pending
        means the recorded obligation is greater than the recorded outlay; payment
        status and contractual due dates are not yet available in the upload.
        <br />
        Model accuracy {formatPercent(metrics.accuracy, 0)} · ROC AUC{" "}
        {metrics.roc_auc === null ? "—" : metrics.roc_auc.toFixed(2)} on the held-out
        test split.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarChartCard
          title="Payment aging by processing lag"
          data={aging}
          valueFormatter={(v) => formatNumber(v)}
        />
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
