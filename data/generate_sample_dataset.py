"""
Builds a synthetic sample_raw_dataset_<timestamp>.xlsx file used to demo the app.
Each run writes a new, timestamped file rather than overwriting the previous one.

The first version of this dataset was random values, which meant the risk model
had nothing to learn and scored worse than a coin flip on Dashboard Home. This
generator instead makes processing lag genuinely depend on the features the
model trains on (agency, county, program, award size, share already outlayed),
so the model finds real structure and the dashboard shows plausible numbers.

The data is still invented. It is shaped like the interns'
Invoice_Late_Payment_Analysis_REAL.xlsx, not drawn from it. Swap in the real
file before quoting any of these numbers to anyone.

Run:  python data/generate_sample_dataset.py
"""

from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 42
N_ROWS = 600
N_VENDORS = 180
TITLE = "Invoice Late Payment Analysis - Sample / Mock Data"


def make_out_path(timestamp: datetime | None = None) -> Path:
    ts = (timestamp or datetime.now()).strftime("%Y%m%d_%H%M%S")
    return Path(__file__).parent / f"sample_raw_dataset_{ts}.xlsx"

# Baseline days added or removed by each dimension. These are what make the
# dataset learnable: a slow agency really is slow across every county.
COUNTY_LAG = {
    "Fulton": -3.5, "Cherokee": 1.0, "DeKalb": 4.5, "Gwinnett": -1.5,
    "Cobb": -2.5, "Clayton": 5.5, "Forsyth": 0.5,
}
AGENCY_LAG = {
    "Dept. of Transportation": -5.5,
    "Dept. of Education": -1.5,
    "Dept. of Health & Human Svcs": 1.5,
    "Dept. of Housing & Urban Dev": 5.0,
    "Dept. of Agriculture": 8.5,
}
PROGRAM_LAG = {
    "CFDA-20.205": -3.0, "CFDA-84.010": -1.0, "CFDA-93.558": 0.5,
    "CFDA-93.575": 2.5, "CFDA-16.738": 4.0,
}

BASE_LAG = 26.0


def build_frame() -> pd.DataFrame:
    rng = np.random.default_rng(SEED)

    county = rng.choice(list(COUNTY_LAG), N_ROWS)
    agency = rng.choice(list(AGENCY_LAG), N_ROWS)
    program = rng.choice(list(PROGRAM_LAG), N_ROWS)
    recipient = [f"Vendor {i:04d}" for i in rng.integers(1, N_VENDORS + 1, N_ROWS)]

    obligation = rng.lognormal(mean=12.4, sigma=0.55, size=N_ROWS).round(2)
    pct_outlayed = rng.beta(5, 3, N_ROWS).round(3)
    outlay = (obligation * pct_outlayed).round(2)

    # Bigger awards clear more slowly; so do awards still largely unpaid.
    size_effect = 4.5 * (np.log(obligation) - np.log(obligation).mean())
    outlay_effect = -9.0 * (pct_outlayed - pct_outlayed.mean())

    lag = (
        BASE_LAG
        + np.array([COUNTY_LAG[c] for c in county])
        + np.array([AGENCY_LAG[a] for a in agency])
        + np.array([PROGRAM_LAG[p] for p in program])
        + size_effect
        + outlay_effect
        + rng.normal(0, 3.0, N_ROWS)  # keeps the label from being trivial
    )
    lag = np.clip(lag, 1.0, None).round(1)

    # Risk Index / Percentile / Tier used to be derived here and shipped as
    # columns in the raw file. A real upload would never come with those
    # precomputed, so that logic now lives in analytics/pipeline.py
    # (see `derive_risk_scores`), which runs on whatever raw file is
    # uploaded -- this generated one included. This function only produces
    # the columns a real raw dataset would actually have.

    return pd.DataFrame({
        "County": county,
        "Recipient": recipient,
        "Awarding Agency": agency,
        "CFDA Program": program,
        "Obligation ($)": obligation,
        "Outlay ($)": outlay,
        "% Outlayed": pct_outlayed,
        "Processing Lag (d)": lag,
    })


def main() -> None:
    df = build_frame()
    out_path = make_out_path()
    with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Invoice Risk Rankings", index=False, startrow=1)
        writer.sheets["Invoice Risk Rankings"]["A1"] = TITLE
    print(f"Wrote {out_path} ({len(df)} rows)")


if __name__ == "__main__":
    main()
