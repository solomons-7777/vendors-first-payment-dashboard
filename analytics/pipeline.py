"""
Analytics engine for the Government Payment Analytics Portal.

This is a refactor of the interns' Week2.py (risk model) so it can run
in-memory inside the Streamlit app instead of as a standalone script that
reads/writes local files. The approach is Week2's: a RandomForest
late-payment classifier on the same six features, feature importance, and
vendor/county/agency/program rollups.

Where it deliberately differs from Week2:

* The forest uses 300 trees, not 500, to keep the upload responsive. On the
  sample dataset that leaves accuracy identical and moves ROC AUC by under
  0.01. Set it back to 500 if you want to match Week2's numbers exactly.
* The county rollup carries the columns the dashboard shows (obligation and
  penalty totals) instead of Week2's Avg_Model_Risk.
* Two guards Week2 didn't have: a single-class label raises PipelineError
  with an explanation, and the split drops stratification when a class has
  only one row (sklearn would otherwise raise on it).
* Estimated_Penalty is computed here rather than in the dashboard, so every
  sheet is built in one place.
* Week2's LogisticRegression comparison and ROC plot are not ported. They
  were model-selection scratch work, and the SRS asks for no new modeling.
* Risk_Index, Risk_Percentile, and Risk_Tier used to arrive precomputed on
  the uploaded file (data/generate_sample_dataset.py built them). A real
  raw dataset would have no equivalent columns, so they're now derived here
  instead -- see `derive_risk_scores` -- from columns every raw upload
  actually has (Processing_Lag, Obligation). Nothing downstream changed:
  build_dashboard_workbook() still emits the same sheet shapes, so app.py
  needs no changes.

It also fixes the schema mismatch between Week2.py's output and Week3.py's
expected input: Week2 produced snake_case columns (Processing_Lag,
Risk_Percentile, ...) but Week3 expected human-readable columns with units
(e.g. "Processing Lag (d)"). build_dashboard_workbook() below produces
sheets in the exact shape the dashboard (app.py) expects.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score

RAW_COLUMNS = [
    "County",
    "Recipient",
    "Awarding_Agency",
    "CFDA_Program",
    "Obligation",
    "Outlay",
    "Pct_Outlayed",
    "Processing_Lag",
]


class PipelineError(ValueError):
    """Raised when the uploaded workbook doesn't match the expected schema."""


def load_raw_sheet(file_like) -> pd.DataFrame:
    """Read the raw 'Invoice Risk Rankings' sheet the same way Week2.py did."""
    df = pd.read_excel(file_like, sheet_name="Invoice Risk Rankings", header=1)
    df.columns = df.columns.astype(str).str.strip()
    df = df.dropna(how="all")

    if len(df.columns) < len(RAW_COLUMNS):
        raise PipelineError(
            f"Expected {len(RAW_COLUMNS)} columns on the 'Invoice Risk Rankings' "
            f"sheet, found {len(df.columns)}. Check the file matches the "
            f"Invoice_Late_Payment_Analysis template."
        )

    # Keep only the template's own columns, dropping anything past them by
    # position. Older raw files (pre-derive_risk_scores) shipped three extra
    # trailing columns -- Risk Index / Risk Percentile / Risk Tier, already
    # precomputed. Keeping those verbatim would collide with the same-named
    # columns derive_risk_scores adds below, producing duplicate columns
    # downstream instead of an error.
    df = df.iloc[:, :len(RAW_COLUMNS)]
    df.columns = RAW_COLUMNS
    df = df.dropna(subset=["County", "Recipient", "Awarding_Agency", "CFDA_Program"])

    numeric_cols = ["Obligation", "Outlay", "Pct_Outlayed", "Processing_Lag"]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())

    return df


def derive_risk_scores(df: pd.DataFrame) -> pd.DataFrame:
    """Add Risk_Index, Risk_Percentile, and Risk_Tier to a loaded raw sheet.

    These three used to arrive precomputed in the uploaded workbook (built
    by data/generate_sample_dataset.py). A real raw dataset has no such
    columns, so they're computed here instead, right after the raw sheet is
    loaded and before the risk model ever sees the data -- these are plain
    feature engineering, not model output.

    Method (same formula the generator used to apply):
      * `size_effect` -- award size, log-scaled and centered on the
        dataset's own mean. Larger obligations tend to clear more slowly,
        so this nudges the score without needing a trained model.
      * `Risk_Index` blends Processing_Lag (75% weight) with that size
        effect (25% weight), then min-max scales the result to [0, 1] so
        it reads like a normalized risk score.
      * `Risk_Percentile` is each row's `Risk_Index` rank within the
        dataset, expressed as a fraction (0-1).
      * `Risk_Tier` buckets `Risk_Percentile` into equal thirds -- Low /
        Medium / High.

    Where these are used downstream: build_dashboard_workbook() renames all
    three straight into the "Invoice Risk Rankings" sheet, and the county
    rollup on "Executive Summary" averages Risk_Percentile per county. In
    app.py, "High Risk Transactions" sorts on Risk Percentile -- not on the
    RandomForest's own Predicted_Risk (see HANDOFF.md's "traps" section).
    """
    df = df.copy()
    lag = df["Processing_Lag"].to_numpy()
    obligation = df["Obligation"].to_numpy()

    log_obligation = np.log(obligation)
    size_effect = 4.5 * (log_obligation - log_obligation.mean())

    raw_risk = 0.75 * lag + 0.25 * (lag.mean() * size_effect / max(size_effect.std(), 1e-9))
    risk_index = (raw_risk - raw_risk.min()) / (raw_risk.max() - raw_risk.min())
    risk_pct = pd.Series(risk_index).rank(pct=True).to_numpy()
    risk_tier = pd.cut(
        risk_pct, bins=[0, 1 / 3, 2 / 3, 1.0], labels=["Low", "Medium", "High"],
        include_lowest=True,
    )

    df["Risk_Index"] = risk_index.round(3)
    df["Risk_Percentile"] = risk_pct.round(3)
    df["Risk_Tier"] = risk_tier

    return df


def run_risk_model(risk_df: pd.DataFrame) -> dict:
    """Same modeling approach as Week2.py: RF classifier on a median-lag
    threshold label, plus feature importance and rollups. Returns the
    enriched dataframe and model metrics.
    """
    lag_threshold = risk_df["Processing_Lag"].median()
    risk_df = risk_df.copy()
    risk_df["Late_Payment"] = (risk_df["Processing_Lag"] > lag_threshold).astype(int)

    if risk_df["Late_Payment"].nunique() < 2:
        raise PipelineError(
            "Every row falls on the same side of the median processing lag, "
            "so a late/on-time label can't be created. Upload a dataset with "
            "more variation in Processing_Lag."
        )

    X = risk_df[["County", "Awarding_Agency", "CFDA_Program", "Obligation", "Outlay", "Pct_Outlayed"]]
    y = risk_df["Late_Payment"]
    X_enc = pd.get_dummies(X, columns=["County", "Awarding_Agency", "CFDA_Program"])

    stratify = y if y.value_counts().min() >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X_enc, y, test_size=0.20, random_state=42, stratify=stratify
    )

    rf = RandomForestClassifier(n_estimators=300, random_state=42, class_weight="balanced")
    rf.fit(X_train, y_train)

    preds = rf.predict(X_test)
    probs = rf.predict_proba(X_test)[:, 1]
    metrics = {
        "accuracy": round(accuracy_score(y_test, preds), 4),
        "roc_auc": round(roc_auc_score(y_test, probs), 4) if y_test.nunique() > 1 else float("nan"),
    }

    risk_df["Predicted_Risk"] = rf.predict_proba(X_enc)[:, 1]
    risk_df["Risk_Rank"] = risk_df["Predicted_Risk"].rank(ascending=False, method="dense")

    importance_df = pd.DataFrame({
        "Feature": X_enc.columns,
        "Importance": rf.feature_importances_,
    }).sort_values("Importance", ascending=False).reset_index(drop=True)

    return {"risk_df": risk_df, "importance_df": importance_df, "metrics": metrics}


def build_dashboard_workbook(file_like) -> dict:
    """
    Full pipeline: raw upload -> Week2 modeling -> the sheets the dashboard
    renders. This is the "run the existing Python analytics engine and
    populate the dashboard" step from the SRS.

    The first four keys are the sheet names Week3.py read, in the shapes it
    expected. "Program Risk" and "Vendor Targeting" are Week2 rollups that
    Week3 had no tab for; app.py now shows them. Note that "Agency & Program
    Risk" keeps its Week3 name but holds agency rows only -- the program
    rows live under "Program Risk".
    """
    raw_df = load_raw_sheet(file_like)
    raw_df = derive_risk_scores(raw_df)
    result = run_risk_model(raw_df)
    risk_df = result["risk_df"]
    importance_df = result["importance_df"]

    cost_of_capital = 0.12
    risk_df["Estimated_Penalty"] = (
        risk_df["Obligation"] * (cost_of_capital / 365) * risk_df["Processing_Lag"]
    )

    # ---- "Invoice Risk Rankings" sheet: rename to the labels app.py's UI uses
    risk_sheet = risk_df.rename(columns={
        "Awarding_Agency": "Awarding Agency",
        "CFDA_Program": "CFDA Program",
        "Obligation": "Obligation ($)",
        "Outlay": "Outlay ($)",
        "Processing_Lag": "Processing Lag (d)",
        "Risk_Index": "Risk Index",
        "Risk_Percentile": "Risk Percentile",
        "Risk_Tier": "Risk Tier",
        "Estimated_Penalty": "Estimated Penalty",
    })

    # ---- "Executive Summary" sheet: county rollup
    county_dashboard = (
        risk_sheet.groupby("County")
        .agg(
            Transactions=("County", "size"),
            Avg_Lag=("Processing Lag (d)", "mean"),
            Avg_Risk_Percentile=("Risk Percentile", "mean"),
            Total_Obligation=("Obligation ($)", "sum"),
            Total_Penalty=("Estimated Penalty", "sum"),
        )
        .sort_values("Avg_Risk_Percentile", ascending=False)
        .reset_index()
    )

    # ---- "Agency & Program Risk" sheet
    agency_dashboard = (
        risk_sheet.groupby("Awarding Agency")
        .agg(
            Awards=("Awarding Agency", "size"),
            Avg_Lag=("Processing Lag (d)", "mean"),
            Avg_Model_Risk=("Predicted_Risk", "mean"),
        )
        .sort_values("Avg_Model_Risk", ascending=False)
        .reset_index()
    )

    # ---- "Program Risk" sheet: Week2's program rollup
    program_dashboard = (
        risk_sheet.groupby("CFDA Program")
        .agg(
            Awards=("CFDA Program", "size"),
            Avg_Lag=("Processing Lag (d)", "mean"),
            Avg_Model_Risk=("Predicted_Risk", "mean"),
        )
        .sort_values("Avg_Model_Risk", ascending=False)
        .reset_index()
    )

    # ---- "Vendor Targeting" sheet: Week2's vendor rollup and Priority_Score
    vendor_dashboard = risk_sheet.groupby("Recipient").agg(
        Awards=("Recipient", "size"),
        Avg_Obligation=("Obligation ($)", "mean"),
        Avg_Outlay=("Outlay ($)", "mean"),
        Avg_Lag=("Processing Lag (d)", "mean"),
        Avg_Model_Risk=("Predicted_Risk", "mean"),
    )
    vendor_dashboard["Priority_Score"] = (
        vendor_dashboard["Avg_Model_Risk"]
        * np.log1p(vendor_dashboard["Awards"])
        * np.log1p(vendor_dashboard["Avg_Obligation"])
        * np.log1p(vendor_dashboard["Avg_Lag"])
    )
    vendor_dashboard = vendor_dashboard.sort_values(
        "Priority_Score", ascending=False
    ).reset_index()

    return {
        "Executive Summary": county_dashboard,
        "Invoice Risk Rankings": risk_sheet,
        "Feature Importance": importance_df,
        "Agency & Program Risk": agency_dashboard,
        "Program Risk": program_dashboard,
        "Vendor Targeting": vendor_dashboard,
        "_metrics": result["metrics"],
    }
