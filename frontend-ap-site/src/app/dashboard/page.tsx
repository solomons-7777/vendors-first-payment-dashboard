"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { ExecutiveSummaryTab } from "@/components/dashboard/tabs/ExecutiveSummaryTab";
import { RiskRankingsTab } from "@/components/dashboard/tabs/RiskRankingsTab";
import { FeatureImportanceTab } from "@/components/dashboard/tabs/FeatureImportanceTab";
import { GroupRiskTab } from "@/components/dashboard/tabs/GroupRiskTab";
import { VendorTargetingTab } from "@/components/dashboard/tabs/VendorTargetingTab";
import { useRequireAuth } from "@/lib/use-require-auth";
import { getWorkbook, getWorkbookFilename } from "@/lib/workbook-store";
import type { Workbook } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { ready } = useRequireAuth();
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const existing = getWorkbook();
    if (!existing) {
      router.replace("/upload");
      return;
    }
    setWorkbook(existing);
    setFilename(getWorkbookFilename());
  }, [ready, router]);

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
      key: "feature-importance",
      label: "Feature Importance",
      content: <FeatureImportanceTab rows={workbook["Feature Importance"]} />,
    },
    {
      key: "agency-risk",
      label: "Agency & Program Risk",
      content: (
        <GroupRiskTab
          rows={workbook["Agency & Program Risk"]}
          getName={(r) => r["Awarding Agency"]}
          nameLabel="Agency"
          nameLabelPlural="Agencies"
          chartTitle="Highest-risk awarding agencies"
        />
      ),
    },
    {
      key: "program-risk",
      label: "Program Risk",
      content: (
        <GroupRiskTab
          rows={workbook["Program Risk"]}
          getName={(r) => r["CFDA Program"]}
          nameLabel="Program"
          nameLabelPlural="Programs"
          chartTitle="Highest-risk CFDA programs"
        />
      ),
    },
    {
      key: "vendor-targeting",
      label: "Vendor Targeting",
      content: <VendorTargetingTab rows={workbook["Vendor Targeting"]} />,
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
