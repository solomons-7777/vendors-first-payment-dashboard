"""
Government Payment Analytics Portal - MVP

Reuses the interns' existing analytics engine (Week2.py's risk model) and
dashboard logic (Week3.py's Streamlit tabs), per Solomon's SRS. Adds the
pieces the SRS calls for that didn't exist yet: a login gate, a Dashboard
Home KPI page, and an upload step that actually runs the analytics engine
on the uploaded file (Week2 and Week3 were previously disconnected --
see README "Known Gaps").

Navigation: Login -> Dashboard Home -> Upload Dataset -> Analytics Dashboard -> Logout
"""

import pandas as pd
import plotly.express as px
import streamlit as st

from analytics.auth import is_authenticated, login_form, logout_button
from analytics.pipeline import PipelineError, build_dashboard_workbook

st.set_page_config(page_title="Government Payment Analytics Portal", layout="wide")

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
        c1, c2, c3, c4, c5 = st.columns(5)
        c1.metric("Total Transactions", f"{len(risk_df):,}")
        c2.metric("Avg Processing Lag", f"{risk_df['Processing Lag (d)'].mean():.1f} Days")
        c3.metric("Average Risk", f"{risk_df['Risk Percentile'].mean():.1%}")
        c4.metric("Total Obligations", f"${risk_df['Obligation ($)'].sum():,.0f}")
        c5.metric("Est. Cashflow Penalty", f"${risk_df['Estimated Penalty'].sum():,.0f}")

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
# ANALYTICS DASHBOARD (Week3.py tabs, reused as-is)
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

    tab1, tab2, tab3, tab4, tab5 = st.tabs(
        ["Executive Summary", "County Performance", "High Risk Transactions",
         "Feature Importance", "Working Capital Impact"]
    )

    with tab1:
        st.header("Executive Summary")
        c1, c2, c3, c4, c5 = st.columns(5)
        c1.metric("Transactions", f"{len(risk_df):,}")
        c2.metric("Average Lag", f"{risk_df['Processing Lag (d)'].mean():.1f} Days")
        c3.metric("Average Risk", f"{risk_df['Risk Percentile'].mean():.1%}")
        c4.metric("Obligations", f"${risk_df['Obligation ($)'].sum():,.0f}")
        c5.metric("Estimated Penalty", f"${risk_df['Estimated Penalty'].sum():,.0f}")
        st.subheader("County Summary")
        st.dataframe(summary_df, use_container_width=True)

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
                         use_container_width=True)
        st.plotly_chart(px.bar(county_perf, x="County", y="Risk Percentile",
                                title="Average Risk Percentile by County"),
                         use_container_width=True)
        st.plotly_chart(px.bar(county_perf, x="County", y="Estimated Penalty",
                                title="Estimated Contractor Cashflow Penalties"),
                         use_container_width=True)
        st.dataframe(county_perf, use_container_width=True)

    with tab3:
        st.header("Highest Risk Transactions")
        top_risk = risk_df.sort_values("Risk Percentile", ascending=False)
        cols = ["County", "Recipient", "Awarding Agency", "CFDA Program",
                "Obligation ($)", "Outlay ($)", "Processing Lag (d)",
                "Risk Index", "Risk Percentile", "Risk Tier"]
        st.dataframe(top_risk[cols], use_container_width=True)
        st.subheader("Top 25 Highest Risk Transactions")
        st.dataframe(top_risk.head(25), use_container_width=True)

    with tab4:
        st.header("Feature Importance Analysis")
        importance_col = feature_df.columns[-1]
        feature_col = feature_df.columns[0]
        st.plotly_chart(
            px.bar(feature_df.head(20), x=feature_col, y=importance_col,
                   title="Structural Drivers of Late Payments"),
            use_container_width=True,
        )
        st.dataframe(feature_df, use_container_width=True)
        st.subheader("Agency & Program Risk")
        st.dataframe(agency_df, use_container_width=True)
        numeric_cols = agency_df.select_dtypes(include=["number"]).columns
        if len(numeric_cols) > 0:
            st.plotly_chart(
                px.bar(agency_df, x=agency_df.columns[0], y=numeric_cols[0],
                       title="Agency Risk Comparison"),
                use_container_width=True,
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
        st.dataframe(matrix, use_container_width=True)

        penalty_df = risk_df.groupby("County")["Estimated Penalty"].sum().reset_index()
        st.plotly_chart(
            px.bar(penalty_df, x="County", y="Estimated Penalty",
                   title="County Contractor Cashflow Impact"),
            use_container_width=True,
        )
