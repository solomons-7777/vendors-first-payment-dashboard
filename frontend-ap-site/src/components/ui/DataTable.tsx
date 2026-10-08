import { ReactNode } from "react";
import clsx from "clsx";

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: Row) => ReactNode;
}

interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row, index: number) => string | number;
  emptyMessage?: string;
}

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "No rows to display.",
}: DataTableProps<Row>) {
  if (rows.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm text-text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-strong bg-surface-sunken">
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  "whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted",
                  col.align === "right" ? "text-right" : "text-left"
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={getRowKey(row, index)}
              className="border-b border-border last:border-0 hover:bg-surface-sunken"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={clsx(
                    "whitespace-nowrap px-4 py-2.5 tabular-nums text-text-primary",
                    col.align === "right" ? "text-right" : "text-left"
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
