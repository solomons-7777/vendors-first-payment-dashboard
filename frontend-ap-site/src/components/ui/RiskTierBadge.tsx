import { AlertTriangle, CheckCircle2, OctagonAlert } from "lucide-react";
import type { RiskTier } from "@/lib/types";

const TIER_CONFIG: Record<
  RiskTier,
  { label: string; textVar: string; bgVar: string; Icon: typeof CheckCircle2 }
> = {
  Low: {
    label: "Low",
    textVar: "var(--status-good)",
    bgVar: "var(--status-good-soft)",
    Icon: CheckCircle2,
  },
  Medium: {
    label: "Medium",
    textVar: "var(--status-warning)",
    bgVar: "var(--status-warning-soft)",
    Icon: AlertTriangle,
  },
  High: {
    label: "High",
    textVar: "var(--status-critical)",
    bgVar: "var(--status-critical-soft)",
    Icon: OctagonAlert,
  },
};

export function RiskTierBadge({ tier }: { tier: RiskTier }) {
  const config = TIER_CONFIG[tier];
  const Icon = config.Icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ color: config.textVar, backgroundColor: config.bgVar }}
    >
      <Icon size={13} strokeWidth={2.5} aria-hidden />
      {config.label}
    </span>
  );
}
