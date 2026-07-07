import streamlit as st
import pandas as pd
import plotly.express as px

# ======================================================
# PAGE CONFIGURATION
# ======================================================

st.set_page_config(
    page_title="Executive AP Portfolio Dashboard",
    layout="wide"
)

st.title("Executive AP Portfolio & Bottleneck Dashboard")
st.markdown(
    """
    Interactive dashboard for analyzing:
    - Late Payment Risk
    - Processing Lags
    - County Performance
    - Agency Risk
    - Working Capital Impact
    """
)

# ======================================================
# FILE UPLOAD
# ======================================================

uploaded_file = st.file_uploader(
    "Upload Invoice_Late_Payment_Analysis_REAL.xlsx",
    type=["xlsx"]
)

if uploaded_file is not None:

    # ==================================================
    # LOAD SHEETS
    # ==================================================

    summary_df = pd.read_excel(
        uploaded_file,
        sheet_name="Executive Summary"
    )

    uploaded_file.seek(0)

    risk_df = pd.read_excel(
        uploaded_file,
        sheet_name="Invoice Risk Rankings",
        header = 1
    )

    uploaded_file.seek(0)

    feature_df = pd.read_excel(
        uploaded_file,
        sheet_name="Feature Importance"
    )

    uploaded_file.seek(0)

    agency_df = pd.read_excel(
        uploaded_file,
        sheet_name="Agency & Program Risk"
    )

    # ==================================================
    # WORKING CAPITAL MODEL
    # ==================================================

    COST_OF_CAPITAL = 0.12

    risk_df["Estimated Penalty"] = (
        risk_df["Obligation ($)"]
        * (COST_OF_CAPITAL / 365)
        * risk_df["Processing Lag (d)"]
    )

    # ==================================================
    # TABS
    # ==================================================

    tab1, tab2, tab3, tab4, tab5 = st.tabs(
        [
            "Executive Summary",
            "County Performance",
            "High Risk Transactions",
            "Feature Importance",
            "Working Capital Impact"
        ]
    )

    # ==================================================
    # TAB 1
    # ==================================================

    with tab1:

        st.header("Executive Summary")

        avg_lag = (
            risk_df["Processing Lag (d)"]
            .mean()
        )

        avg_risk = (
            risk_df["Risk Percentile"]
            .mean()
        )

        total_obligations = (
            risk_df["Obligation ($)"]
            .sum()
        )

        total_outlays = (
            risk_df["Outlay ($)"]
            .sum()
        )

        total_penalty = (
            risk_df["Estimated Penalty"]
            .sum()
        )

        c1, c2, c3, c4, c5 = st.columns(5)

        c1.metric(
            "Transactions",
            f"{len(risk_df):,}"
        )

        c2.metric(
            "Average Lag",
            f"{avg_lag:.1f} Days"
        )

        c3.metric(
            "Average Risk",
            f"{avg_risk:.1%}"
        )

        c4.metric(
            "Obligations",
            f"${total_obligations:,.0f}"
        )

        c5.metric(
            "Estimated Penalty",
            f"${total_penalty:,.0f}"
        )

        st.subheader("County Summary")

        st.dataframe(summary_df)

    # ==================================================
    # TAB 2
    # ==================================================

    with tab2:

        st.header("County Performance")

        county_perf = (
            risk_df
            .groupby("County")
            .agg({
                "Processing Lag (d)": "mean",
                "Risk Percentile": "mean",
                "Obligation ($)": "sum",
                "Estimated Penalty": "sum"
            })
            .reset_index()
        )

        fig1 = px.bar(
            county_perf,
            x="County",
            y="Processing Lag (d)",
            title="Average Processing Lag by County"
        )

        st.plotly_chart(
            fig1,
            use_container_width=True
        )

        fig2 = px.bar(
            county_perf,
            x="County",
            y="Risk Percentile",
            title="Average Risk Percentile by County"
        )

        st.plotly_chart(
            fig2,
            use_container_width=True
        )

        fig3 = px.bar(
            county_perf,
            x="County",
            y="Estimated Penalty",
            title="Estimated Contractor Cashflow Penalties"
        )

        st.plotly_chart(
            fig3,
            use_container_width=True
        )

        st.dataframe(county_perf)

    # ==================================================
    # TAB 3
    # ==================================================

    with tab3:

        st.header("Highest Risk Transactions")

        top_risk = (
            risk_df
            .sort_values(
                "Risk Percentile",
                ascending=False
            )
        )

        st.dataframe(
            top_risk[
                [
                    "County",
                    "Recipient",
                    "Awarding Agency",
                    "CFDA Program",
                    "Obligation ($)",
                    "Outlay ($)",
                    "Processing Lag (d)",
                    "Risk Index",
                    "Risk Percentile",
                    "Risk Tier"
                ]
            ]
        )

        st.subheader("Top 25 Highest Risk Transactions")

        st.dataframe(
            top_risk.head(25)
        )

    # ==================================================
    # TAB 4
    # ==================================================

    with tab4:

        st.header("Feature Importance Analysis")

        importance_col = feature_df.columns[-1]
        feature_col = feature_df.columns[0]

        fig = px.bar(
            feature_df,
            x=feature_col,
            y=importance_col,
            title="Structural Drivers of Late Payments"
        )

        st.plotly_chart(
            fig,
            use_container_width=True
        )

        st.dataframe(feature_df)

        st.subheader("Agency & Program Risk")

        st.dataframe(agency_df)

        numeric_cols = agency_df.select_dtypes(
            include=["number"]
        ).columns

        if len(numeric_cols) > 0:

            fig2 = px.bar(
                agency_df,
                x=agency_df.columns[0],
                y=numeric_cols[0],
                title="Agency Risk Comparison"
            )

            st.plotly_chart(
                fig2,
                use_container_width=True
            )

    # ==================================================
    # TAB 5
    # ==================================================

    with tab5:

        st.header("Working Capital Sensitivity Modeling")

        invoice_amount = st.slider(
            "Invoice Amount ($)",
            min_value=1000,
            max_value=1000000,
            value=50000,
            step=1000
        )

        delay_days = st.slider(
            "Delay Days",
            min_value=0,
            max_value=180,
            value=30
        )

        annual_rate = st.slider(
            "Annual Cost of Capital",
            min_value=0.01,
            max_value=0.30,
            value=0.12
        )

        penalty = (
            invoice_amount
            * (annual_rate / 365)
            * delay_days
        )

        st.metric(
            "Estimated Cash Flow Penalty",
            f"${penalty:,.2f}"
        )

        st.subheader(
            "Sensitivity Matrix"
        )

        invoice_sizes = [
            25000,
            50000,
            100000,
            250000,
            500000
        ]

        delays = [
            15,
            30,
            45,
            60,
            90
        ]

        matrix = pd.DataFrame(
            index=delays,
            columns=invoice_sizes
        )

        for d in delays:

            for amt in invoice_sizes:

                matrix.loc[d, amt] = round(
                    amt
                    * (annual_rate / 365)
                    * d,
                    2
                )

        st.dataframe(matrix)

        penalty_df = (
            risk_df
            .groupby("County")
            ["Estimated Penalty"]
            .sum()
            .reset_index()
        )

        fig = px.bar(
            penalty_df,
            x="County",
            y="Estimated Penalty",
            title="County Contractor Cashflow Impact"
        )

        st.plotly_chart(
            fig,
            use_container_width=True
        )

else:

    st.info(
        "Upload your Excel workbook to begin."
    )
