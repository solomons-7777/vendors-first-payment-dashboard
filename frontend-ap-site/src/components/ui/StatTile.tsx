import { ReactNode } from "react";
import clsx from "clsx";
import { Card } from "./Card";

interface StatTileProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: ReactNode;
  tone?: "default" | "good" | "warning" | "critical";
}

const toneClasses: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "text-text-primary",
  good: "text-status-good",
  warning: "text-status-warning",
  critical: "text-status-critical",
};

export function StatTile({ label, value, sublabel, icon, tone = "default" }: StatTileProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <div className={clsx("mt-2 text-2xl font-semibold", toneClasses[tone])}>
        {value}
      </div>
      {sublabel && (
        <div className="mt-1 text-xs text-text-secondary">{sublabel}</div>
      )}
    </Card>
  );
}
