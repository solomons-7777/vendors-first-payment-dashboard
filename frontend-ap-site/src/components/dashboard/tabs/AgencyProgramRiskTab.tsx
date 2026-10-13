"use client";

import { useMemo, useState } from "react";
import { BarChartCard } from "@/components/charts/BarChartCard";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { formatDays, formatNumber, formatPercent } from "@/lib/format";
import type { AgencyRiskRow, ProgramRiskRow } from "@/lib/types";

type Dimension = "agency" | "program";
type SortKey = "risk" | "lag" | "awards";

interface PerformanceRow {
  name: string;
  awards: number;
  avgLag: number;
  avgRisk: number;
}

const controlClass =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary";

export function AgencyProgramRiskTab({
  agencies,
  programs,
}: {
  agencies: AgencyRiskRow[];
  programs: ProgramRiskRow[];
}) {
  const [dimension, setDimension] = useState<Dimension>("agency");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("risk");

  const rows = useMemo<PerformanceRow[]>(() => {
    const normalized =
      dimension === "agency"
        ? agencies.map((row) => ({
            name: row["Awarding Agency"],
            awards: row.Awards,
            avgLag: row.Avg_Lag,
            avgRisk: row.Avg_Model_Risk,
          }))
        : programs.map((row) => ({
            name: row["CFDA Program"],
            awards: row.Awards,
            avgLag: row.Avg_Lag,
            avgRisk: row.Avg_Model_Risk,
          }));

    const needle = query.trim().toLowerCase();
    return normalized
      .filter((row) => !needle || row.name.toLowerCase().includes(needle))
      .sort((a, b) => {
        if (sortBy === "lag") return b.avgLag - a.avgLag;
        if (sortBy === "awards") return b.awards - a.awards;
        return b.avgRisk - a.avgRisk;
      });
  }, [agencies, dimension, programs, query, sortBy]);

  const columns: DataTableColumn<PerformanceRow>[] = [
    {
      key: "name",
      header: dimension === "agency" ? "Agency" : "Program",
      render: (row) => row.name,
    },
    {
      key: "awards",
      header: "Awards",
      align: "right",
      render: (row) => formatNumber(row.awards),
    },
    {
      key: "avgLag",
      header: "Avg. Lag",
      align: "right",
      render: (row) => formatDays(row.avgLag),
    },
    {
      key: "avgRisk",
      header: "Avg. Model Risk",
      align: "right",
      render: (row) => formatPercent(row.avgRisk),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border-strong bg-surface p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_minmax(220px,1fr)_220px] md:items-end">
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              View by
            </span>
            <div className="flex rounded-md border border-border-strong bg-surface-sunken p-1">
              {(["agency", "program"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={dimension === value}
                  onClick={() => setDimension(value)}
                  className={`rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    dimension === value
                      ? "bg-surface text-brand shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Filter {dimension}
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${dimension} name`}
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
              <option value="risk">Average model risk</option>
              <option value="lag">Average lag</option>
              <option value="awards">Award count</option>
            </select>
          </label>
        </div>
      </div>

      <BarChartCard
        title={`Highest ${sortBy === "risk" ? "risk" : sortBy === "lag" ? "lag" : "award volume"} by ${dimension}`}
        data={rows.slice(0, 10).map((row) => ({
          label: row.name,
          value: sortBy === "risk" ? row.avgRisk : sortBy === "lag" ? row.avgLag : row.awards,
        }))}
        valueFormatter={(value) =>
          sortBy === "risk"
            ? formatPercent(value, 0)
            : sortBy === "lag"
              ? formatDays(value)
              : formatNumber(value)
        }
        height={Math.max(220, Math.min(rows.length, 10) * 32)}
      />

      <div className="overflow-hidden rounded-lg border border-border-strong bg-surface">
        <div className="border-b border-border-strong px-5 py-4">
          <h3 className="text-sm font-semibold text-text-primary">
            {dimension === "agency" ? "Agencies" : "Programs"} ({rows.length})
          </h3>
        </div>
        <DataTable columns={columns} rows={rows} getRowKey={(row) => row.name} />
      </div>
    </div>
  );
}
