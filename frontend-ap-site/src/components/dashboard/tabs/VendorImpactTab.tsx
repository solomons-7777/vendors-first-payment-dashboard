"use client";

import { useMemo, useState } from "react";
import { BarChartCard } from "@/components/charts/BarChartCard";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { formatCurrency, formatDays, formatNumber, formatPercent } from "@/lib/format";
import type { InvoiceRiskRow } from "@/lib/types";

type SortKey = "outstanding" | "overdue" | "lag" | "obligation";

interface VendorImpactRow {
  recipient: string;
  transactions: number;
  overduePayments: number;
  overdueRate: number;
  outstandingBalance: number;
  totalObligation: number;
  avgLag: number;
  maxLag: number;
}

interface VendorAccumulator extends VendorImpactRow {
  totalLag: number;
}

const controlClass =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary";

export function VendorImpactTab({ rows }: { rows: InvoiceRiskRow[] }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("outstanding");

  const vendors = useMemo<VendorImpactRow[]>(() => {
    const grouped = new Map<string, VendorAccumulator>();

    for (const row of rows) {
      const current = grouped.get(row.Recipient) ?? {
        recipient: row.Recipient,
        transactions: 0,
        overduePayments: 0,
        overdueRate: 0,
        outstandingBalance: 0,
        totalObligation: 0,
        avgLag: 0,
        maxLag: 0,
        totalLag: 0,
      };
      const lag = row["Processing Lag (d)"];
      current.transactions += 1;
      current.overduePayments += lag > 30 ? 1 : 0;
      current.outstandingBalance += Math.max(
        row["Obligation ($)"] - row["Outlay ($)"],
        0
      );
      current.totalObligation += row["Obligation ($)"];
      current.totalLag += lag;
      current.maxLag = Math.max(current.maxLag, lag);
      grouped.set(row.Recipient, current);
    }

    const needle = query.trim().toLowerCase();
    return Array.from(grouped.values())
      .map((row) => ({
        ...row,
        avgLag: row.totalLag / row.transactions,
        overdueRate: row.overduePayments / row.transactions,
      }))
      .filter((row) => !needle || row.recipient.toLowerCase().includes(needle))
      .sort((a, b) => {
        if (sortBy === "overdue") return b.overduePayments - a.overduePayments;
        if (sortBy === "lag") return b.avgLag - a.avgLag;
        if (sortBy === "obligation") return b.totalObligation - a.totalObligation;
        return b.outstandingBalance - a.outstandingBalance;
      });
  }, [query, rows, sortBy]);

  const columns: DataTableColumn<VendorImpactRow>[] = [
    { key: "recipient", header: "Vendor", render: (row) => row.recipient },
    {
      key: "transactions",
      header: "Payments",
      align: "right",
      render: (row) => formatNumber(row.transactions),
    },
    {
      key: "overduePayments",
      header: "Overdue",
      align: "right",
      render: (row) => `${formatNumber(row.overduePayments)} (${formatPercent(row.overdueRate)})`,
    },
    {
      key: "outstandingBalance",
      header: "Outstanding Balance",
      align: "right",
      render: (row) => formatCurrency(row.outstandingBalance),
    },
    {
      key: "avgLag",
      header: "Avg. Aging",
      align: "right",
      render: (row) => formatDays(row.avgLag),
    },
    {
      key: "maxLag",
      header: "Oldest",
      align: "right",
      render: (row) => formatDays(row.maxLag),
    },
    {
      key: "totalObligation",
      header: "Total Obligations",
      align: "right",
      render: (row) => formatCurrency(row.totalObligation),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm leading-6 text-text-secondary">
        This view measures payment impact on vendors rather than ranking outreach
        prospects. Overdue means more than 30 processing days; outstanding balance is
        obligation minus outlay. Small and local vendor impact can be added when vendor
        classification fields are available.
      </p>

      <div className="rounded-lg border border-border-strong bg-surface p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Filter vendor
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vendor name"
              className={controlClass}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Rank by
            </span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortKey)}
              className={controlClass}
            >
              <option value="outstanding">Outstanding balance</option>
              <option value="overdue">Overdue payments</option>
              <option value="lag">Average aging</option>
              <option value="obligation">Total obligations</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarChartCard
          title="Vendors with the largest outstanding balances"
          data={[...vendors]
            .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
            .slice(0, 10)
            .map((row) => ({ label: row.recipient, value: row.outstandingBalance }))}
          valueFormatter={formatCurrency}
        />
        <BarChartCard
          title="Vendors with the most overdue payments"
          data={[...vendors]
            .sort((a, b) => b.overduePayments - a.overduePayments)
            .slice(0, 10)
            .map((row) => ({ label: row.recipient, value: row.overduePayments }))}
          valueFormatter={formatNumber}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border-strong bg-surface">
        <div className="border-b border-border-strong px-5 py-4">
          <h3 className="text-sm font-semibold text-text-primary">
            Vendor payment impact ({vendors.length})
          </h3>
        </div>
        <DataTable columns={columns} rows={vendors} getRowKey={(row) => row.recipient} />
      </div>
    </div>
  );
}
