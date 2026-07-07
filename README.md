# Government Payment Analytics Portal (MVP demo)

Working demo built from the intern team's Week 2/3 output (`original_intern_code/`)
per Solomon's SRS (`original_intern_code/Government_Payment_Analytics_Portal_MVP_SRS.pdf`).

## Run it

```bash
pip install -r requirements.txt
streamlit run app.py
```

Log in with `demo@vendorsfirst.club` / `demo123` (shown on the login screen),
then go to **Upload Dataset** and upload `data/sample_raw_dataset.xlsx` to see
the full flow, or upload a real dataset in the same shape.

## What this is

* **Login page** - session-based email/password gate (`analytics/auth.py`).
* **Dashboard Home** - KPI cards (transactions, avg lag, avg risk, obligations, penalty).
* **Upload Dataset** - upload an Excel file; it runs the risk model live and
  populates the dashboard (`analytics/pipeline.py`).
* **Analytics Dashboard** - the interns' 5 tabs (Executive Summary, County
  Performance, High Risk Transactions, Feature Importance, Working Capital
  Impact), reusing their charts and calculations.

## What changed vs. the interns' original code, and why

The two scripts they handed off (`Week2.py`, `Week3.py`) were not actually
connected:

* **Week2.py** read a local file, trained the models, and printed results to
  the console. It never wrote a file Week3 could read.
* **Week3.py** expected a user to already have a 4-sheet workbook
  ("Executive Summary", "Invoice Risk Rankings", "Feature Importance",
  "Agency & Program Risk") - which nothing actually produced.
* The column names didn't even match between the two
  (`Processing_Lag` vs. `"Processing Lag (d)"`, `Risk_Percentile` vs.
  `"Risk Percentile"`, etc).

`analytics/pipeline.py` is Week2's modeling logic (same RandomForest
classifier, same features, same rollups) refactored to run in-memory and
output the exact sheet shapes Week3's tabs expect, so **Upload Dataset ->
Analytics Dashboard** is a real, working pipeline instead of two disconnected
scripts. Everything in `app.py`'s Analytics Dashboard tab is otherwise a
direct port of `Week3.py`.

## Known gaps / not done (see SRS section 8, "Out of Scope")

* **Tech stack**: the SRS asks for React/Next.js/Tailwind + FastAPI. This is
  Streamlit, matching what the interns actually built. Rebuilding the same
  functionality in that stack is real project work (auth, an API layer, chart
  parity, deployment) - realistically days, not the ~1-2 days available before
  Wed/Thu. Recommend treating that rebuild as Phase 2, and using this as the
  Phase 1 / demo deliverable.
* **Auth**: `analytics/auth.py` is a single hardcoded demo credential, not a
  real user store. Fine for a demo, not for anything beyond it.
* **Data**: `data/sample_raw_dataset.xlsx` is synthetic (random values), not
  the interns' real `Invoice_Late_Payment_Analysis_REAL.xlsx` (shared via
  OneDrive links in Tayveon's email, not as an attachment, so it isn't in this
  repo). Swap in the real file to validate against actual numbers - column
  names must match `analytics/pipeline.RAW_COLUMNS`.
* **Model quality caveat inherited from the interns' approach**: the "late
  payment" label is defined as "processing lag above the dataset's own
  median" rather than an actual contractual due date, so accuracy/ROC AUC
  numbers are relative, not calibrated against ground truth. Worth flagging
  to Solomon before this number goes in front of anyone external.
* **Report export**: SRS marks this optional; not built.
