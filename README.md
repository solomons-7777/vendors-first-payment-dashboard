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

## Deploy it

The app runs on Streamlit Community Cloud as-is:

1. Push this repo to GitHub.
2. At [share.streamlit.io](https://share.streamlit.io), pick the repo, branch
   `main`, and `app.py` as the entrypoint.
3. **Before sharing the URL**, open *Settings -> Secrets* on the deployed app
   and paste real credentials:

   ```toml
   [credentials]
   "you@vendorsfirst.club" = "a-real-password"
   ```

Step 3 is not optional. With no secrets set, the app falls back to the demo
account and says so on the login screen, so a public URL is an open door.
`analytics/auth.py` is still a plaintext credential check either way - it
gates a demo, it is not real auth. See "Known gaps".

## What this is

* **Login page** - session-based email/password gate (`analytics/auth.py`).
* **Dashboard Home** - KPI cards (transactions, avg lag, avg risk, obligations, penalty).
* **Upload Dataset** - upload an Excel file; it runs the risk model live and
  populates the dashboard (`analytics/pipeline.py`).
* **Analytics Dashboard** - the interns' 5 tabs (Executive Summary, County
  Performance, High Risk Transactions, Feature Importance, Working Capital
  Impact), reusing their charts and calculations, plus a 6th **Vendor
  Targeting** tab (see below).

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
classifier, same six features, same four rollups) refactored to run in-memory
and output the sheet shapes Week3's tabs expect, so **Upload Dataset ->
Analytics Dashboard** is a real, working pipeline instead of two disconnected
scripts. Everything in `app.py`'s Analytics Dashboard tab is otherwise a
direct port of `Week3.py`.

Where the port deviates from Week2, and why:

* **300 trees instead of 500**, to keep the upload responsive. On the sample
  dataset accuracy is identical and ROC AUC moves by under 0.01. Change it in
  `analytics/pipeline.run_risk_model` to match Week2 exactly.
* **The county rollup** carries obligation and penalty totals, which the
  dashboard displays, rather than Week2's `Avg_Model_Risk`.
* **Week2's LogisticRegression comparison and ROC plot are not ported.** They
  were model-selection scratch work, and the SRS asks for no new modeling.
* **A 6th tab, Vendor Targeting.** Week2's most directly useful output was its
  ranked "top 20 vendors to target" list (`Priority_Score` = model risk scaled
  by award count, award size, and lag). Week3 had no tab for it, so it would
  otherwise have been computed and thrown away. The SRS names 5 tabs, so this
  is one past spec - but it reuses existing intern analytics rather than adding
  new ones, which is what SRS section 1 asks for. Drop the tab if Solomon wants
  a strict 5.
* **Week2's program rollup** now appears under Feature Importance next to the
  agency rollup. The workbook key `"Agency & Program Risk"` keeps its Week3
  name but holds agency rows only; program rows are under `"Program Risk"`.

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
  repo). Swap in the real file to validate against actual numbers - columns
  must appear in the same **order** as `analytics/pipeline.RAW_COLUMNS`, since
  the loader maps them positionally.

  The sample file is built by `data/generate_sample_dataset.py`, which makes
  processing lag genuinely depend on agency, county, program, award size, and
  share outlayed. The model therefore finds real structure (about 0.81
  accuracy, 0.89 ROC AUC) and the charts show a plausible story. The numbers
  are still invented - they demonstrate that the pipeline works, and nothing
  about actual government payment behaviour. Do not quote them externally.
* **Model quality caveat inherited from the interns' approach**: the "late
  payment" label is defined as "processing lag above the dataset's own
  median" rather than an actual contractual due date, so accuracy/ROC AUC
  numbers are relative, not calibrated against ground truth. Worth flagging
  to Solomon before this number goes in front of anyone external. Also
  inherited from Week2: `Predicted_Risk` is scored over every row including
  the 80% the model trained on, so per-row risk reads optimistically. The
  accuracy and ROC AUC on Dashboard Home come from the held-out test split
  and are honest; the per-row column is not.
* **The model does little work in the UI.** "High Risk Transactions" sorts by
  `Risk Percentile`, which arrives precomputed in the uploaded file, not by
  the model's `Predicted_Risk`. That is what `Week3.py` did and the port kept
  it. The RandomForest currently drives Feature Importance, the agency and
  program rollups, and Vendor Targeting - not the headline risk table. Worth
  deciding which number the dashboard should rank on.
* **Uploads are matched by column position, not name.** `load_raw_sheet`
  checks the column count and then renames by order, so a file with the right
  number of columns in a different order is silently mislabeled rather than
  rejected. Fine for the fixed template; fix before accepting files from
  jurisdictions.
* **The "Top 25" table shows model internals.** `app.py` filters columns for
  the main risk table but passes `top_risk.head(25)` unfiltered, so
  `Late_Payment`, `Predicted_Risk`, and `Risk_Rank` are visible. Harmless in
  Week3, where those columns didn't exist; worth a column filter now.
* **Report export**: SRS marks this optional; not built.
