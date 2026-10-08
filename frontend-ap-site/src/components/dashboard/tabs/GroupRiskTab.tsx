import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { BarChartCard } from "@/components/charts/BarChartCard";
import { formatDays, formatNumber, formatPercent } from "@/lib/format";

interface GroupRiskRow {
  Awards: number;
  Avg_Lag: number;
  Avg_Model_Risk: number;
}

interface Props<Row extends GroupRiskRow> {
  rows: Row[];
  getName: (row: Row) => string;
  nameLabel: string;
  nameLabelPlural: string;
  chartTitle: string;
}

const CHART_LIMIT = 10;

export function GroupRiskTab<Row extends GroupRiskRow>({
  rows,
  getName,
  nameLabel,
  nameLabelPlural,
  chartTitle,
}: Props<Row>) {
  const sorted = [...rows].sort((a, b) => b.Avg_Model_Risk - a.Avg_Model_Risk);
  const top = sorted.slice(0, CHART_LIMIT);

  const columns: DataTableColumn<Row>[] = [
    { key: "name", header: nameLabel, render: (r) => getName(r) },
    {
      key: "Awards",
      header: "Awards",
      align: "right",
      render: (r) => formatNumber(r.Awards),
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
  ];

  return (
    <div className="flex flex-col gap-6">
      <BarChartCard
        title={chartTitle}
        data={top.map((r) => ({ label: getName(r), value: r.Avg_Model_Risk }))}
        valueFormatter={(v) => formatPercent(v, 0)}
        height={Math.max(220, top.length * 32)}
      />
      <div className="overflow-hidden rounded-lg border border-border-strong bg-surface">
        <div className="border-b border-border-strong px-5 py-4">
          <h3 className="text-sm font-semibold text-text-primary">
            All {nameLabelPlural.toLowerCase()} ({sorted.length})
          </h3>
        </div>
        <DataTable columns={columns} rows={sorted} getRowKey={(r, i) => getName(r) + i} />
      </div>
    </div>
  );
}
