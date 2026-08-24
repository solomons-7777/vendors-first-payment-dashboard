# Handoff

Written for whoever picks this up next. Assume you cannot reach me. This
document repeats what is elsewhere in the repo rather than pointing at it, so
it works on its own.

The codebase is about 500 lines across three files. You can read all of it in
an afternoon.

## Start here

Get it on screen before reading the rest. No services, no database, no API keys.

```bash
git clone https://github.com/liug88/vendors-first-payment-dashboard.git
cd vendors-first-payment-dashboard
pip install -r requirements.txt
streamlit run app.py
```

Sign in with `demo@vendorsfirst.club` / `demo123`. The login screen shows those
and warns the build is unsecured; that warning is deliberate and goes away once
real credentials exist. Go to **Upload Dataset**, upload
`data/sample_raw_dataset.xlsx`, and the rest of the app fills in.

Nothing works before that upload. There is no bundled state -- the dashboard
reads `st.session_state["workbook"]`, which only exists after a file goes
through the pipeline. Empty pages are the app working correctly, not a bug.

## Transfer these before the trail goes cold

Four things live outside the repo, tied to accounts or inboxes. If nobody moves
them, the code survives and the project does not. This is the time-sensitive
part.

**The repository is on a personal GitHub account.** It is not in a company org.
Collaborator access is not enough -- if that account goes away, so does the repo
and everything deployed from it, collaborators included. Transfer ownership to a
Vendors First org, or fork it and make that fork canonical, before anyone builds
on top of it.

**Any Streamlit Cloud deployment inherits the same problem.** Streamlit
Community Cloud deploys from a GitHub account and the app belongs to whoever
connected it. Deploy from the company-owned repo, not a personal fork, or you
will redo this later -- including the URL you hand to stakeholders.

**The real dataset is not in the repo and never was.** The interns'
`Invoice_Late_Payment_Analysis_REAL.xlsx` was shared as OneDrive links in
Tayveon's email, not as an attachment, so it could not be committed. Ask Tayveon
for the file directly. Everything the dashboard shows today is synthetic. Until
that real file goes through the pipeline, no number in this app has been
validated against anything.

**There are no credentials to hand over, by design.** `.streamlit/secrets.toml`
is gitignored and was never committed; only `secrets.toml.example` is in the
repo. You are not missing a password -- you set your own. Until you do, the app
falls back to the demo account and says so on the login screen.

## How it fits together

Read these three:

* `app.py` -- every screen. Login gate, sidebar nav, three pages, six dashboard
  tabs. All UI, no analytics.
* `analytics/pipeline.py` -- the engine. Loads the Excel file, trains the model,
  builds every table the dashboard renders.
* `analytics/auth.py` -- the login gate. Under seventy lines: plaintext
  comparison, one session flag. Demo-grade on purpose.

Reference only:

* `original_intern_code/` -- Week2.py and Week3.py as handed over. Nothing
  imports them. Kept so you can check the port against the original. The SRS PDF
  is in the same folder; section 8 is the out-of-scope list, worth reading
  before you promise anyone anything.
* `data/generate_sample_dataset.py` -- rebuilds the synthetic demo file. Run it
  if you change the schema.

### The contract between the two halves

`build_dashboard_workbook()` takes an uploaded file and returns a dict. Every
key is a sheet the dashboard expects. Change this shape and `app.py` breaks --
with a `KeyError` at render time, not at load time, so test the tab you touched.

```
"Executive Summary"       # county rollup, drives tab 1
"Invoice Risk Rankings"   # every row, plus model columns
"Feature Importance"      # what the model weights
"Agency & Program Risk"   # agency rows only, despite the name
"Program Risk"            # program rows live here instead
"Vendor Targeting"        # ranked vendor list, Priority_Score
"_metrics"                # accuracy + ROC AUC for the KPI caption
```

That fourth key is a wart. Week3 named it `"Agency & Program Risk"` but it
carries agency rows only; program rows sit under a separate key. I kept the
original name so the port stayed traceable back to Week3. Rename both if you
want it clean -- two call sites in `app.py`, nothing else reads them.

## Why `pipeline.py` exists

Read this before touching the analytics.

The two scripts handed over were never connected to each other. Week2 trained
the model and printed to the console -- it never wrote a file. Week3 opened a
four-sheet workbook and read from it. Nothing in the codebase produced that
workbook, and the column names did not match across the gap either
(`Processing_Lag` against `"Processing Lag (d)"`, `Risk_Percentile` against
`"Risk Percentile"`).

Neither script was wrong on its own. Run either and it does what it says. The
join between them was the part nobody owned.

`analytics/pipeline.py` is that missing middle: Week2's modeling logic
refactored to run in memory and emit exactly the sheets Week3's tabs read. That
is the whole reason the file exists. If you ever find yourself simplifying it
back into two scripts, this is what you would be undoing.

### Where the port deviates from Week2

All four are recorded in the module docstring too:

* **300 trees instead of 500**, to keep uploads responsive.
* **The county rollup carries obligation and penalty totals**, because the
  dashboard displays those, rather than Week2's `Avg_Model_Risk`.
* **The LogisticRegression comparison and ROC plot are not ported.** They were
  model-selection scratch work.
* **Two guards Week2 did not have.** A single-class dataset now raises a
  readable `PipelineError` instead of a scikit-learn traceback mid-upload, and a
  dataset too small to stratify falls back to an unstratified split rather than
  failing.

I also surfaced two Week2 rollups Week3 had no tab for -- the program rollup and
the ranked vendor list. Both were being computed and discarded. The vendor list
became a sixth tab, one past the five the SRS names. That was my call and it is
easy to reverse.

## Traps

Known, deliberate, left in. None will stop a demo. Every one will bite you the
first time you take this seriously. Ordered by how badly.

**Uploads are matched by column position, not name.** `load_raw_sheet` checks
only that there are *at least* as many columns as `RAW_COLUMNS` (11), then
renames the first eleven by position. Wrong order, or extra columns in front,
and the file is silently mislabeled rather than rejected -- a dashboard full of
confident, wrong numbers with no error anywhere. Fine for one fixed template.
Fix it before you accept files from anyone else.

**Per-row risk scores are computed on training data.** `Predicted_Risk` is
scored over every row, including the 80% the model trained on, so per-row risk
reads optimistically. Inherited from Week2, kept for fidelity. The accuracy and
ROC AUC on Dashboard Home come from the held-out split and are honest; the
per-row column is not. Do not let the two be quoted the same way.

**The model does not drive the headline risk table.** "High Risk Transactions"
sorts by `Risk Percentile`, which arrives precomputed in the uploaded file, not
by the model's own output. That is what Week3 did and the port kept it. The
RandomForest currently drives feature importance, the rollups, and vendor
targeting -- and nothing on the screen people look at first.

**The late-payment label is a median split, not a due date.** Late means
"processing lag above this dataset's own median," not "past a contractual
deadline." Accuracy and ROC AUC are relative, not calibrated against ground
truth. This is the caveat most likely to embarrass someone in a meeting. Flag it
before any of these numbers go in front of an external audience.

**The Top 25 table leaks model internals.** The main risk table filters its
columns; `top_risk.head(25)` right below it does not, so `Late_Payment`,
`Predicted_Risk`, and `Risk_Rank` are visible to the user. Harmless in Week3,
where those columns did not exist. One column filter fixes it.

**Auth is a plaintext dict comparison.** No hashing, no user store, no lockout,
no session expiry. It gates a demo; it is not authentication. Replace it
wholesale before this is reachable by anyone outside the company -- do not
incrementally harden it.

**Every number on screen right now is invented.** `sample_raw_dataset.xlsx` is
generated, not drawn from real payments. It is built so processing lag genuinely
depends on agency, county, program, award size, and share outlayed, which is why
the model scores about 0.81 accuracy and 0.89 ROC AUC and the charts tell a
plausible story. That demonstrates the pipeline works, and nothing about actual
government payment behavior. Never quote these figures externally.

## Status against the SRS

Section 7 of the SRS lists the deliverables.

| Deliverable | State | Notes |
| --- | --- | --- |
| Secure login page | Done | Functionally yes. Demo-grade -- see Traps. |
| Dashboard home with KPIs | Done | Five cards, plus a model-metrics caption. |
| Dataset upload | Done | Runs the model live on upload. Excel only. |
| Analytics dashboard | Done | Six tabs. The SRS names five; the sixth is Vendor Targeting. |
| Working analytics engine | Done | This was the real work. See "Why pipeline.py exists". |
| Deployed web application | Next | Runs on Streamlit Cloud as-is. Needs a GitHub login and real secrets first. |
| Report export | Optional | The SRS marks it optional. Not built. |
| React / Next.js / FastAPI stack | Phase 2 | SRS section 6 asks for this. Built in Streamlit instead -- see below. |

## Three decisions that are now yours

Open questions I could not settle alone. My reasoning is here so you are not
starting cold, but these belong to you and Solomon now.

**Whether the Streamlit build stands, or gets rebuilt in React.** The SRS asks
for React/Next.js/Tailwind plus FastAPI. This is Streamlit, because that is what
the interns actually built and there were one to two days before the deadline,
not the days a rebuild needs (auth, an API layer, chart parity, deployment). My
recommendation: treat this as Phase 1, working software people can click today,
and scope the rebuild separately with the demo as its spec. That is a product
call, not an engineering one.

**Which number the dashboard should rank risk on.** Today the headline table
sorts by the percentile that arrives in the uploaded file, while the model's own
prediction sits unused beside it. Both are defensible. Nobody has chosen.
Whoever chooses should also decide whether the median-split label is good
enough, or whether real due dates need to come from somewhere.

**Whether the sixth tab stays.** Vendor Targeting reuses Week2's
`Priority_Score` -- model risk scaled by award count, award size, and lag -- to
rank vendors worth approaching. It is the most directly commercial thing in the
app and it was being thrown away. It is also one tab past what the SRS names.
Keep it or cut it, but decide on purpose.

## If you only do four things

1. **Move the repo somewhere the company owns.** Everything else assumes this.
   Minutes.
2. **Deploy it, with real credentials set before you share the URL.**
   `share.streamlit.io`, pick the repo, branch `main`, entrypoint `app.py`. Then
   Settings -> Secrets and paste a `[credentials]` block. Not optional: with no
   secrets set the app falls back to the published demo account, and a public
   URL is an open door. The README has the exact TOML. About 10 minutes.
3. **Get the real dataset from Tayveon and run it through.** Columns must appear
   in the same *order* as `RAW_COLUMNS`, since the loader maps positionally.
   This is the first moment any number in this app means anything. Expect the
   model metrics to move.
4. **Put a column filter on the Top 25 table.** Smallest item on the traps list,
   most visible to anyone demoing. One line.

## Where the rest is written down

The README carries the same known-gaps list in more detail, plus run and deploy
steps. Every deviation from the interns' code is in the docstring of the file
that deviates. The SRS PDF is in `original_intern_code/`. Commit messages
explain the why of each change, not just the what.

**Who to ask.** Solomon owns the spec and the scope calls. Tayveon has the real
dataset. For anything about the code itself, the answer should be in this
document or in the repo -- and if it is not, that is a gap in this handoff, not
something you need me for.
