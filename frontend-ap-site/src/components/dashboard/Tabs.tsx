"use client";

import { ReactNode, useState } from "react";
import clsx from "clsx";

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
  section?: "operations" | "insights";
}

export function Tabs({ items }: { items: TabItem[] }) {
  const [active, setActive] = useState(items[0]?.key);
  const operationalItems = items.filter((item) => item.section !== "insights");
  const insightItems = items.filter((item) => item.section === "insights");

  const renderTab = (item: TabItem) => {
    const isActive = item.key === active;
    return (
      <button
        key={item.key}
        id={`tab-${item.key}`}
        role="tab"
        aria-controls={`panel-${item.key}`}
        aria-selected={isActive}
        onClick={() => setActive(item.key)}
        className={clsx(
          "relative px-4 py-2.5 text-sm font-medium transition-colors",
          isActive ? "text-brand" : "text-text-secondary hover:text-text-primary"
        )}
      >
        {item.label}
        {isActive && (
          <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
        )}
      </button>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2 border-b border-border-strong">
        <div role="tablist" aria-label="Operational dashboard views" className="flex flex-wrap gap-1">
          {operationalItems.map(renderTab)}
        </div>
        {insightItems.length > 0 && (
          <div className="flex items-center gap-1 border-l border-border-strong pl-4">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Model insights
            </span>
            <div role="tablist" aria-label="Model insight views" className="flex flex-wrap gap-1">
              {insightItems.map(renderTab)}
            </div>
          </div>
        )}
      </div>
      <div className="mt-6">
        {items.map((item) => (
          <div
            key={item.key}
            id={`panel-${item.key}`}
            aria-labelledby={`tab-${item.key}`}
            hidden={item.key !== active}
            role="tabpanel"
          >
            {item.key === active && item.content}
          </div>
        ))}
      </div>
    </div>
  );
}
