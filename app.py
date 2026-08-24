"""
Government Payment Analytics Portal - MVP

Reuses the interns' existing analytics engine (Week2.py's risk model) and
dashboard logic (Week3.py's Streamlit tabs), per Solomon's SRS. Adds the
pieces the SRS calls for that didn't exist yet: a login gate, a Dashboard
Home KPI page, and an upload step that actually runs the analytics engine
on the uploaded file (Week2 and Week3 were previously disconnected --
see README "Known Gaps").

Also surfaces two Week2 rollups Week3 had no tab for: its program risk
table (under Feature Importance) and its ranked vendor targeting list
(a 6th tab). Both are existing intern analytics, not new modeling.

Navigation: Login -> Dashboard Home -> Upload Dataset -> Analytics Dashboard -> Logout
"""

import pandas as pd
import plotly.express as px
import streamlit as st

from analytics.auth import is_authenticated, login_form, logout_button
from analytics.pipeline import PipelineError, build_dashboard_workbook

st.set_page_config(page_title="Government Payment Analytics Portal", layout="wide")

# The federal Prompt Payment Act gives an agency 30 days from a proper invoice
# before interest is owed. Every lag figure on the KPI rows is measured against
# it, so the numbers mean something without the reader supplying a benchmark.
PROMPT_PAY_DAYS = 30

# Matches the cost_of_capital used for Estimated_Penalty in analytics/pipeline.py.
COST_OF_CAPITAL = 0.12


def headline_stats(df: pd.DataFrame) -> dict:
    """Derived KPI figures, each paired with something to compare it against."""
    lag = df["Processing Lag (d)"]
    obligations = df["Obligation ($)"].sum()
    late = df[lag > PROMPT_PAY_DAYS]
    penalty = df["Estimated Penalty"].sum()
    agency_lag = df.groupby("Awarding Agency")["Processing Lag (d)"].mean().sort_values()

    return {
        "invoices": len(df),
        "late_count": len(late),
        "late_share": len(late) / len(df) if len(df) else 0.0,
        "avg_lag": lag.mean(),
        "lag_vs_standard": lag.mean() - PROMPT_PAY_DAYS,
        "obligations": obligations,
        "late_value": late["Obligation ($)"].sum(),
        "late_value_share": late["Obligation ($)"].sum() / obligations if obligations else 0.0,
        "penalty": penalty,
        "penalty_share": penalty / obligations if obligations else 0.0,
        "fastest_agency": agency_lag.index[0],
        "fastest_lag": agency_lag.iloc[0],
        "slowest_agency": agency_lag.index[-1],
        "slowest_lag": agency_lag.iloc[-1],
        "agency_spread": agency_lag.iloc[-1] - agency_lag.iloc[0],
    }


def render_headline(df: pd.DataFrame) -> None:
    """KPI rows shared by Dashboard Home and the Executive Summary tab."""
    s = headline_stats(df)

    st.markdown("##### Are invoices being paid on time?")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric(
        "Paid late", f"{s['late_share']:.0%}",
        delta=f"{s['late_count']:,} of {s['invoices']:,} invoices",
        delta_color="off", border=True,
    )
    c2.metric(
        "Average wait", f"{s['avg_lag']:.1f} days",
        delta=f"{s['lag_vs_standard']:+.1f} vs {PROMPT_PAY_DAYS}-day standard",
        delta_color="inverse", border=True,
    )
    c3.metric(
        "Value waiting", f"${s['late_value'] / 1e6:,.1f}M",
        delta=f"{s['late_value_share']:.0%} of ${s['obligations'] / 1e6:,.0f}M obligated",
        delta_color="off", border=True,
    )
    c4.metric(
        "Cost of the delay", f"${s['penalty'] / 1e6:,.2f}M",
        delta=f"{s['penalty_share']:.1%} of obligations",
        delta_color="off", border=True,
    )
    st.caption(
        f"**Late** means over {PROMPT_PAY_DAYS} days, the federal Prompt Payment Act "
        f"standard for a proper invoice. **Cost of the delay** is what that wait costs "
        f"contractors to finance, at {COST_OF_CAPITAL:.0%} annual cost of capital."
    )

    st.markdown("##### Where the delay is concentrated")
    d1, d2, d3 = st.columns(3)
    d1.metric(
        "Slowest agency", f"{s['slowest_lag']:.1f} days",
        delta=s["slowest_agency"], delta_color="off", border=True,
    )
    d2.metric(
        "Fastest agency", f"{s['fastest_lag']:.1f} days",
        delta=s["fastest_agency"], delta_color="off", border=True,
    )
    d3.metric(
        "Gap between them", f"{s['agency_spread']:.1f} days",
        delta="same work, different agency", delta_color="off", border=True,
    )

    # The average alone reads as "fine" whenever it sits under the standard, so
    # say out loud when it is hiding a tail that does not.
    if s["lag_vs_standard"] < 0 and s["late_share"] >= 0.20:
        st.info(
            f"The average sits under the {PROMPT_PAY_DAYS}-day standard, but "
            f"{s['late_share']:.0%} of invoices do not. The average is hiding the "
            f"tail: {s['agency_spread']:.1f} days separate the fastest agency from "
            f"the slowest."
        )


if not is_authenticated():
    login_form()
    st.stop()

logout_button()
st.sidebar.markdown(f"Signed in as **{st.session_state.get('user_email', 'demo user')}**")
page = st.sidebar.radio(
    "Navigate",
    ["Dashboard Home", "Upload Dataset", "Analytics Dashboard"],
)

workbook = st.session_state.get("workbook")

# ============================================================
# DASHBOARD HOME
# ============================================================
if page == "Dashboard Home":
    st.title("Dashboard Home")

    if workbook is None:
        st.info("No dataset loaded yet. Go to **Upload Dataset** to get started.")
    else:
        risk_df = workbook["Invoice Risk Rankings"]
        render_headline(risk_df)

        st.divider()
        metrics = workbook.get("_metrics", {})
        if metrics:
            st.caption(
                f"Late-payment classifier: accuracy {metrics.get('accuracy')}, "
                f"ROC AUC {metrics.get('roc_auc')}"
            )

# ============================================================
# UPLOAD DATASET
# ============================================================
elif page == "Upload Dataset":
    st.title("Upload Dataset")
    st.markdown(
        "Upload a payment dataset (same shape as `Invoice_Late_Payment_Analysis.xlsx`, "
        "sheet **Invoice Risk Rankings**). This runs the existing risk model and "
        "populates the Analytics Dashboard."
    )

    uploaded_file = st.file_uploader("Upload workbook", type=["xlsx"])

    if uploaded_file is not None:
        with st.spinner("Running analytics engine..."):
            try:
                st.session_state["workbook"] = build_dashboard_workbook(uploaded_file)
                st.success("Dataset processed. See Dashboard Home or Analytics Dashboard.")
            except PipelineError as e:
                st.error(str(e))
            except Exception as e:
                st.error(f"Couldn't process this file: {e}")

# ============================================================
# ANALYTICS DASHBOARD (Week3.py's 5 tabs, reused as-is, plus a 6th for
# Week2's vendor targeting list -- see README)
# ============================================================
elif page == "Analytics Dashboard":
    st.title("Analytics Dashboard")

    if workbook is None:
        st.info("Upload a dataset first (see **Upload Dataset**).")
        st.stop()

    summary_df = workbook["Executive Summary"]
    risk_df = workbook["Invoice Risk Rankings"]
    feature_df = workbook["Feature Importance"]
    agency_df = workbook["Agency & Program Risk"]
    program_df = workbook["Program Risk"]
    vendor_df = workbook["Vendor Targeting"]

    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs(
        ["Executive Summary", "County Performance", "High Risk Transactions",
         "Feature Importance", "Working Capital Impact", "Vendor Targeting"]
    )

    with tab1:
        st.header("Executive Summary")
        render_headline(risk_df)

        st.divider()
        st.subheader("By county")
        st.caption(
            "Sorted by average risk percentile. Counties at the top pair slow "
            "processing with the invoices most likely to run late."
        )
        st.dataframe(
            summary_df,
            width="stretch",
            hide_index=True,
            column_config={
                "Transactions": st.column_config.NumberColumn("Invoices", format="%d"),
                "Avg_Lag": st.column_config.NumberColumn("Avg wait", format="%.1f d"),
                "Avg_Risk_Percentile": st.column_config.ProgressColumn(
                    "Avg risk", min_value=0.0, max_value=1.0, format="percent"
                ),
                "Total_Obligation": st.column_config.NumberColumn("Obligated", format="dollar"),
                "Total_Penalty": st.column_config.NumberColumn("Cost of delay", format="dollar"),
            },
        )

    with tab2:
        st.header("County Performance")
        county_perf = (
            risk_df.groupby("County")
            .agg({
                "Processing Lag (d)": "mean",
                "Risk Percentile": "mean",
                "Obligation ($)": "sum",
                "Estimated Penalty": "sum",
            })
            .reset_index()
        )
        st.plotly_chart(px.bar(county_perf, x="County", y="Processing Lag (d)",
                                title="Average Processing Lag by County"),
                         width="stretch")
        st.plotly_chart(px.bar(county_perf, x="County", y="Risk Percentile",
                                title="Average Risk Percentile by County"),
                         width="stretch")
        st.plotly_chart(px.bar(county_perf, x="County", y="Estimated Penalty",
                                title="Estimated Contractor Cashflow Penalties"),
                         width="stretch")
        st.dataframe(county_perf, width="stretch")

    with tab3:
        st.header("Highest Risk Transactions")
        top_risk = risk_df.sort_values("Risk Percentile", ascending=False)
        cols = ["County", "Recipient", "Awarding Agency", "CFDA Program",
                "Obligation ($)", "Outlay ($)", "Processing Lag (d)",
                "Risk Index", "Risk Percentile", "Risk Tier"]
        st.dataframe(top_risk[cols], width="stretch")
        st.subheader("Top 25 Highest Risk Transactions")
        st.dataframe(top_risk.head(25), width="stretch")

    with tab4:
        st.header("Feature Importance Analysis")
        importance_col = feature_df.columns[-1]
        feature_col = feature_df.columns[0]
        st.plotly_chart(
            px.bar(feature_df.head(20), x=feature_col, y=importance_col,
                   title="Structural Drivers of Late Payments"),
            width="stretch",
        )
        st.dataframe(feature_df, width="stretch")
        st.subheader("Agency Risk")
        st.dataframe(agency_df, width="stretch")
        numeric_cols = agency_df.select_dtypes(include=["number"]).columns
        if len(numeric_cols) > 0:
            st.plotly_chart(
                px.bar(agency_df, x=agency_df.columns[0], y=numeric_cols[0],
                       title="Agency Risk Comparison"),
                width="stretch",
            )
        st.subheader("Program Risk")
        st.dataframe(program_df, width="stretch")
        st.plotly_chart(
            px.bar(program_df, x="CFDA Program", y="Avg_Model_Risk",
                   title="Program Risk Comparison"),
            width="stretch",
        )

    with tab5:
        st.header("Working Capital Sensitivity Modeling")
        invoice_amount = st.slider("Invoice Amount ($)", 1000, 1000000, 50000, step=1000)
        delay_days = st.slider("Delay Days", 0, 180, 30)
        annual_rate = st.slider("Annual Cost of Capital", 0.01, 0.30, 0.12)
        penalty = invoice_amount * (annual_rate / 365) * delay_days
        st.metric("Estimated Cash Flow Penalty", f"${penalty:,.2f}")

        st.subheader("Sensitivity Matrix")
        invoice_sizes = [25000, 50000, 100000, 250000, 500000]
        delays = [15, 30, 45, 60, 90]
        matrix = pd.DataFrame(index=delays, columns=invoice_sizes)
        for d in delays:
            for amt in invoice_sizes:
                matrix.loc[d, amt] = round(amt * (annual_rate / 365) * d, 2)
        st.dataframe(matrix, width="stretch")

        penalty_df = risk_df.groupby("County")["Estimated Penalty"].sum().reset_index()
        st.plotly_chart(
            px.bar(penalty_df, x="County", y="Estimated Penalty",
                   title="County Contractor Cashflow Impact"),
            width="stretch",
        )

    with tab6:
        st.header("Vendor Targeting")
        st.caption(
            "Week2's Priority_Score ranks vendors by model risk, scaled by how "
            "many awards they hold, how large those awards are, and how long "
            "they wait. Higher means a better prospect to approach."
        )
        st.plotly_chart(
            px.bar(vendor_df.head(20), x="Recipient", y="Priority_Score",
                   title="Top 20 Vendors by Priority Score"),
            width="stretch",
        )
        st.dataframe(vendor_df, width="stretch")
