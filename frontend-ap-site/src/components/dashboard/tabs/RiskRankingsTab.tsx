"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { RiskTierBadge } from "@/components/ui/RiskTierBadge";
import { formatCurrency, formatDays, formatPercent } from "@/lib/format";
import type { InvoiceRiskRow } from "@/lib/types";

const DISPLAY_LIMIT = 50;
type SortKey = "risk" | "lag" | "obligation" | "outlay" | "outstanding";
type SortDirection = "desc" | "asc";

const controlClass =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary";

export function RiskRankingsTab({ rows }: { rows: InvoiceRiskRow[] }) {
  const [query, setQuery] = useState("");
  const [county, setCounty] = useState("");
  const [agency, setAgency] = useState("");
  const [program, setProgram] = useState("");
  const [tier, setTier] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("risk");
  const [direction, setDirection] = useState<SortDirection>("desc");

  const options = useMemo(
    () => ({
      counties: Array.from(new Set(rows.map((row) => row.County))).sort(),
      agencies: Array.from(new Set(rows.map((row) => row["Awarding Agency"]))).sort(),
      programs: Array.from(new Set(rows.map((row) => row["CFDA Program"]))).sort(),
      tiers: Array.from(new Set(rows.map((row) => row["Risk Tier"]))).sort(),
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const valueFor = (row: InvoiceRiskRow) => {
      if (sortBy === "lag") return row["Processing Lag (d)"];
      if (sortBy === "obligation") return row["Obligation ($)"];
      if (sortBy === "outlay") return row["Outlay ($)"];
      if (sortBy === "outstanding") {
        return Math.max(row["Obligation ($)"] - row["Outlay ($)"], 0);
      }
      return row["Risk Percentile"];
    };

    return rows
      .filter(
        (row) =>
          (!needle || row.Recipient.toLowerCase().includes(needle)) &&
          (!county || row.County === county) &&
          (!agency || row["Awarding Agency"] === agency) &&
          (!program || row["CFDA Program"] === program) &&
          (!tier || row["Risk Tier"] === tier)
      )
      .sort((a, b) => {
        const comparison = valueFor(a) - valueFor(b);
        return direction === "desc" ? -comparison : comparison;
      });
  }, [agency, county, direction, program, query, rows, sortBy, tier]);

  const top = filtered.slice(0, DISPLAY_LIMIT);

  const resetFilters = () => {
    setQuery("");
    setCounty("");
    setAgency("");
    setProgram("");
    setTier("");
    setSortBy("risk");
    setDirection("desc");
  };

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
      key: "outstanding",
      header: "Outstanding",
      align: "right",
      render: (r) =>
        formatCurrency(Math.max(r["Obligation ($)"] - r["Outlay ($)"], 0)),
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
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border-strong bg-surface p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Recipient
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipient"
              className={controlClass}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              County
            </span>
            <select value={county} onChange={(event) => setCounty(event.target.value)} className={controlClass}>
              <option value="">All counties</option>
              {options.counties.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Awarding agency
            </span>
            <select value={agency} onChange={(event) => setAgency(event.target.value)} className={controlClass}>
              <option value="">All agencies</option>
              {options.agencies.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Program
            </span>
            <select value={program} onChange={(event) => setProgram(event.target.value)} className={controlClass}>
              <option value="">All programs</option>
              {options.programs.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Risk tier
            </span>
            <select value={tier} onChange={(event) => setTier(event.target.value)} className={controlClass}>
              <option value="">All tiers</option>
              {options.tiers.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Sort by
            </span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)} className={controlClass}>
              <option value="risk">Risk percentile</option>
              <option value="lag">Processing lag</option>
              <option value="obligation">Obligation</option>
              <option value="outlay">Outlay</option>
              <option value="outstanding">Outstanding balance</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Direction
            </span>
            <select value={direction} onChange={(event) => setDirection(event.target.value as SortDirection)} className={controlClass}>
              <option value="desc">Highest first</option>
              <option value="asc">Lowest first</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-sunken hover:text-text-primary"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-strong bg-surface">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border-strong px-5 py-4">
          <h3 className="text-sm font-semibold text-text-primary">
            Transaction action list
          </h3>
          <span className="text-xs text-text-muted">
            Showing {top.length} of {filtered.length} matching transactions ({rows.length} total)
          </span>
        </div>
        <DataTable
          columns={columns}
          rows={top}
          getRowKey={(row, index) => `${row.Recipient}-${row["Awarding Agency"]}-${index}`}
          emptyMessage="No transactions match the selected filters."
        />
      </div>
    </div>
  );
}
