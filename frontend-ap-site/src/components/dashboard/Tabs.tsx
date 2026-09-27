"use client";

import { ReactNode, useState } from "react";
import clsx from "clsx";

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ items }: { items: TabItem[] }) {
  const [active, setActive] = useState(items[0]?.key);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Dashboard sections"
        className="flex flex-wrap gap-1 border-b border-border-strong"
      >
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(item.key)}
              className={clsx(
                "relative px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-brand"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {item.label}
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-6">
        {items.map((item) => (
          <div key={item.key} hidden={item.key !== active} role="tabpanel">
            {item.key === active && item.content}
          </div>
        ))}
      </div>
    </div>
  );
}
