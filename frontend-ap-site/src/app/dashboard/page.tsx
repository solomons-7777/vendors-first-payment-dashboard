"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { ExecutiveSummaryTab } from "@/components/dashboard/tabs/ExecutiveSummaryTab";
import { RiskRankingsTab } from "@/components/dashboard/tabs/RiskRankingsTab";
import { FeatureImportanceTab } from "@/components/dashboard/tabs/FeatureImportanceTab";
import { AgencyProgramRiskTab } from "@/components/dashboard/tabs/AgencyProgramRiskTab";
import { VendorImpactTab } from "@/components/dashboard/tabs/VendorImpactTab";
import { useRequireAuth } from "@/lib/use-require-auth";
import { getWorkbook, getWorkbookFilename } from "@/lib/workbook-store";
import type { Workbook } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { ready } = useRequireAuth();
  const workbook: Workbook | null = ready ? getWorkbook() : null;
  const filename = ready ? getWorkbookFilename() : null;
  const hasWorkbook = workbook !== null;

  useEffect(() => {
    if (ready && !hasWorkbook) {
      router.replace("/upload");
    }
  }, [hasWorkbook, ready, router]);

  if (!ready || !workbook) return null;

  const tabs: TabItem[] = [
    {
      key: "executive-summary",
      label: "Executive Summary",
      content: (
        <ExecutiveSummaryTab
          summary={workbook["Executive Summary"]}
          riskRows={workbook["Invoice Risk Rankings"]}
          metrics={workbook._metrics}
        />
      ),
    },
    {
      key: "risk-rankings",
      label: "High Risk Transactions",
      content: <RiskRankingsTab rows={workbook["Invoice Risk Rankings"]} />,
    },
    {
      key: "agency-risk",
      label: "Agency & Program Risk",
      content: (
        <AgencyProgramRiskTab
          agencies={workbook["Agency & Program Risk"]}
          programs={workbook["Program Risk"]}
        />
      ),
    },
    {
      key: "vendor-impact",
      label: "Vendor Impact",
      content: <VendorImpactTab rows={workbook["Invoice Risk Rankings"]} />,
    },
    {
      key: "feature-importance",
      label: "Feature Importance",
      section: "insights",
      content: <FeatureImportanceTab rows={workbook["Feature Importance"]} />,
    },
  ];

  return (
    <PageShell>
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
          {filename && (
            <p className="mt-1 text-sm text-text-secondary">
              Source: <span className="font-medium">{filename}</span>
            </p>
          )}
        </div>
        <Link
          href="/upload"
          className="text-sm font-medium text-brand hover:text-brand-strong"
        >
          Upload a different file
        </Link>
      </div>
      <Tabs items={tabs} />
    </PageShell>
  );
}
