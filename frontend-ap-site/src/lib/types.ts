export type RiskTier = "Low" | "Medium" | "High";

export interface ExecutiveSummaryRow {
  County: string;
  Transactions: number;
  Avg_Lag: number;
  Avg_Risk_Percentile: number;
  Total_Obligation: number;
  Total_Penalty: number;
}

export interface InvoiceRiskRow {
  County: string;
  Recipient: string;
  "Awarding Agency": string;
  "CFDA Program": string;
  "Obligation ($)": number;
  "Outlay ($)": number;
  Pct_Outlayed: number;
  "Processing Lag (d)": number;
  "Risk Index": number;
  "Risk Percentile": number;
  "Risk Tier": RiskTier;
  Late_Payment: number;
  Predicted_Risk: number;
  Risk_Rank: number;
  "Estimated Penalty": number;
}

export interface FeatureImportanceRow {
  Feature: string;
  Importance: number;
}

export interface AgencyRiskRow {
  "Awarding Agency": string;
  Awards: number;
  Avg_Lag: number;
  Avg_Model_Risk: number;
}

export interface ProgramRiskRow {
  "CFDA Program": string;
  Awards: number;
  Avg_Lag: number;
  Avg_Model_Risk: number;
}

export interface VendorTargetingRow {
  Recipient: string;
  Awards: number;
  Avg_Obligation: number;
  Avg_Outlay: number;
  Avg_Lag: number;
  Avg_Model_Risk: number;
  Priority_Score: number;
}

export interface Metrics {
  accuracy: number | null;
  roc_auc: number | null;
}

export interface Workbook {
  "Executive Summary": ExecutiveSummaryRow[];
  "Invoice Risk Rankings": InvoiceRiskRow[];
  "Feature Importance": FeatureImportanceRow[];
  "Agency & Program Risk": AgencyRiskRow[];
  "Program Risk": ProgramRiskRow[];
  "Vendor Targeting": VendorTargetingRow[];
  _metrics: Metrics;
}
