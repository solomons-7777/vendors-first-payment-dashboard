import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { RiskTierBadge } from "@/components/ui/RiskTierBadge";
import { formatCurrency, formatDays, formatPercent } from "@/lib/format";
import type { InvoiceRiskRow } from "@/lib/types";

const DISPLAY_LIMIT = 50;

export function RiskRankingsTab({ rows }: { rows: InvoiceRiskRow[] }) {
  const sorted = [...rows].sort((a, b) => b["Risk Percentile"] - a["Risk Percentile"]);
  const top = sorted.slice(0, DISPLAY_LIMIT);

  const columns: DataTableColumn<InvoiceRiskRow>[] = [
    { key: "County", header: "County", render: (r) => r.County },
    { key: "Recipient", header: "Recipient", render: (r) => r.Recipient },
    {
      key: "Awarding Agency",
      header: "Awarding Agency",
      render: (r) => r["Awarding Agency"],
    },
    { key: "CFDA Program", header: "CFDA Program", render: (r) => r["CFDA Program"] },
    {
      key: "Obligation ($)",
      header: "Obligation",
      align: "right",
      render: (r) => formatCurrency(r["Obligation ($)"]),
    },
    {
      key: "Outlay ($)",
      header: "Outlay",
      align: "right",
      render: (r) => formatCurrency(r["Outlay ($)"]),
    },
    {
      key: "Processing Lag (d)",
      header: "Lag",
      align: "right",
      render: (r) => formatDays(r["Processing Lag (d)"]),
    },
    {
      key: "Risk Percentile",
      header: "Risk Percentile",
      align: "right",
      render: (r) => formatPercent(r["Risk Percentile"]),
    },
    {
      key: "Risk Tier",
      header: "Risk Tier",
      render: (r) => <RiskTierBadge tier={r["Risk Tier"]} />,
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border-strong bg-surface">
      <div className="flex items-baseline justify-between border-b border-border-strong px-5 py-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Highest risk transactions
        </h3>
        <span className="text-xs text-text-muted">
          Showing top {Math.min(DISPLAY_LIMIT, rows.length)} of {rows.length}, ranked by
          risk percentile
        </span>
      </div>
      <DataTable columns={columns} rows={top} getRowKey={(_, i) => i} />
    </div>
  );
}
