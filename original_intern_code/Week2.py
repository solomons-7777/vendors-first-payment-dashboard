import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    roc_auc_score,
    classification_report
)

# =====================================================
# LOAD DATA
# =====================================================

risk_df = pd.read_excel(
    "Invoice_Late_Payment_Analysis_REAL.xlsx",
    sheet_name="Invoice Risk Rankings",
    header=1
)

# =====================================================
# CLEAN DATA
# =====================================================

risk_df.columns = risk_df.columns.astype(str).str.strip()

risk_df = risk_df.dropna(how="all")

risk_df.columns = [
    "County",
    "Recipient",
    "Awarding_Agency",
    "CFDA_Program",
    "Obligation",
    "Outlay",
    "Pct_Outlayed",
    "Processing_Lag",
    "Risk_Index",
    "Risk_Percentile",
    "Risk_Tier"
]

risk_df = risk_df.dropna(
    subset=[
        "County",
        "Recipient",
        "Awarding_Agency",
        "CFDA_Program"
    ]
)

numeric_cols = [
    "Obligation",
    "Outlay",
    "Pct_Outlayed",
    "Processing_Lag",
    "Risk_Index",
    "Risk_Percentile"
]

for col in numeric_cols:
    risk_df[col] = pd.to_numeric(
        risk_df[col],
        errors="coerce"
    )

risk_df[numeric_cols] = (
    risk_df[numeric_cols]
    .fillna(
        risk_df[numeric_cols].median()
    )
)

# =====================================================
# TARGET CREATION
# =====================================================

print("\nProcessing Lag Summary")
print(risk_df["Processing_Lag"].describe())

# Use median lag as threshold

lag_threshold = risk_df["Processing_Lag"].median()

risk_df["Late_Payment"] = (
    risk_df["Processing_Lag"] > lag_threshold
).astype(int)

print("\nTarget Distribution")
print(risk_df["Late_Payment"].value_counts())

if risk_df["Late_Payment"].nunique() < 2:
    raise ValueError(
        "Target contains only one class. "
        "Adjust threshold."
    )

# =====================================================
# FEATURES
# =====================================================

X = risk_df[
    [
        "County",
        "Awarding_Agency",
        "CFDA_Program",
        "Obligation",
        "Outlay",
        "Pct_Outlayed"
    ]
]

y = risk_df["Late_Payment"]

# =====================================================
# ENCODE CATEGORICALS
# =====================================================

X = pd.get_dummies(
    X,
    columns=[
        "County",
        "Awarding_Agency",
        "CFDA_Program"
    ]
)

# =====================================================
# TRAIN / TEST SPLIT
# =====================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

# =====================================================
# MODEL
# =====================================================

rf = RandomForestClassifier(
    n_estimators=500,
    random_state=42,
    class_weight="balanced"
)

rf.fit(X_train, y_train)

# =====================================================
# EVALUATION
# =====================================================

preds = rf.predict(X_test)

probs = rf.predict_proba(X_test)[:, 1]

print("\n==============================")
print("MODEL PERFORMANCE")
print("==============================")

print(
    "Accuracy:",
    round(
        accuracy_score(y_test, preds),
        4
    )
)

print(
    "ROC AUC:",
    round(
        roc_auc_score(y_test, probs),
        4
    )
)

print(
    classification_report(
        y_test,
        preds
    )
)

# =====================================================
# LOGISTIC REGRESSION MODEL (COMPARISON)
# =====================================================

from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report

# Reuse the SAME X_train, X_test, y_train, y_test already created for the Random Forest
# (same features, same split -> fair comparison)

# Logistic Regression needs scaled features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train logistic regression with balanced class weights (matches the RF setup)
logreg = LogisticRegression(max_iter=5000, class_weight="balanced")
logreg.fit(X_train_scaled, y_train)

# Predict
lr_preds = logreg.predict(X_test_scaled)
lr_probs = logreg.predict_proba(X_test_scaled)[:, 1]

print("\n==============================")
print("LOGISTIC REGRESSION PERFORMANCE")
print("==============================")
print("Accuracy:", round(accuracy_score(y_test, lr_preds), 4))
print("ROC AUC: ", round(roc_auc_score(y_test, lr_probs), 4))
print("\n", classification_report(y_test, lr_preds))

# =====================================================
# MODEL COMPARISON: RANDOM FOREST VS LOGISIC REGRESSION
# =====================================================

import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, auc

# Collect both models' scores
rf_acc = accuracy_score(y_test, preds)
rf_auc = roc_auc_score(y_test, probs)
lr_acc = accuracy_score(y_test, lr_preds)
lr_auc = roc_auc_score(y_test, lr_probs)

# Comparison table
comparison = pd.DataFrame({
    "Model": ["Random Forest", "Logistic Regression"],
    "Accuracy": [round(rf_acc, 4), round(lr_acc, 4)],
    "ROC_AUC": [round(rf_auc, 4), round(lr_auc, 4)]
})
print(comparison.to_string(index=False))

# ROC curves for both, on one plot
plt.figure(figsize=(8, 6))
for name, prob, color in [("Random Forest", probs, "#2dd4bf"),
                          ("Logistic Regression", lr_probs, "#ff1d6c")]:
    fpr, tpr, _ = roc_curve(y_test, prob)
    plt.plot(fpr, tpr, color=color, lw=2, label=f"{name} (AUC = {auc(fpr, tpr):.3f})")

plt.plot([0, 1], [0, 1], "k--", label="Random guess")
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("ROC Curve Comparison — Late Payment Prediction")
plt.legend(loc="lower right")
plt.tight_layout()
plt.savefig('ROC_Comparison_model.jpg', dpi=300, bbox_inches = 'tight')

# =====================================================
# PREDICT RISK
# =====================================================

risk_df["Predicted_Risk"] = (
    rf.predict_proba(X)[:, 1]
)

risk_df["Risk_Rank"] = (
    risk_df["Predicted_Risk"]
    .rank(
        ascending=False,
        method="dense"
    )
)

# =====================================================
# FEATURE IMPORTANCE
# =====================================================

importance_df = pd.DataFrame(
    {
        "Feature": X.columns,
        "Importance": rf.feature_importances_
    }
)

importance_df = (
    importance_df
    .sort_values(
        "Importance",
        ascending=False
    )
)

print("\nTOP FEATURES")
print(importance_df.head(20))

# =====================================================
# VENDOR TARGETING
# =====================================================

vendor_dashboard = (
    risk_df
    .groupby("Recipient")
    .agg(
        Awards=("Recipient", "size"),
        Avg_Obligation=("Obligation", "mean"),
        Avg_Outlay=("Outlay", "mean"),
        Avg_Lag=("Processing_Lag", "mean"),
        Avg_Model_Risk=("Predicted_Risk", "mean")
    )
)

vendor_dashboard["Priority_Score"] = (
    vendor_dashboard["Avg_Model_Risk"]
    * np.log1p(vendor_dashboard["Awards"])
    * np.log1p(vendor_dashboard["Avg_Obligation"])
    * np.log1p(vendor_dashboard["Avg_Lag"])
)

vendor_dashboard = (
    vendor_dashboard
    .sort_values(
        "Priority_Score",
        ascending=False
    )
)

print("\n==============================")
print("TOP 20 VENDORS TO TARGET")
print("==============================")

print(vendor_dashboard.head(20))

# =====================================================
# COUNTY DASHBOARD
# =====================================================

county_dashboard = (
    risk_df
    .groupby("County")
    .agg(
        Transactions=("County", "size"),
        Avg_Lag=("Processing_Lag", "mean"),
        Avg_Model_Risk=("Predicted_Risk", "mean")
    )
    .sort_values(
        "Avg_Model_Risk",
        ascending=False
    )
)

print("\nCOUNTY DASHBOARD")
print(county_dashboard)

# =====================================================
# AGENCY DASHBOARD
# =====================================================

agency_dashboard = (
    risk_df
    .groupby("Awarding_Agency")
    .agg(
        Awards=("Awarding_Agency", "size"),
        Avg_Lag=("Processing_Lag", "mean"),
        Avg_Model_Risk=("Predicted_Risk", "mean")
    )
    .sort_values(
        "Avg_Model_Risk",
        ascending=False
    )
)

print("\nAGENCY DASHBOARD")
print(agency_dashboard.head(15))

# =====================================================
# PROGRAM DASHBOARD
# =====================================================

program_dashboard = (
    risk_df
    .groupby("CFDA_Program")
    .agg(
        Awards=("CFDA_Program", "size"),
        Avg_Lag=("Processing_Lag", "mean"),
        Avg_Model_Risk=("Predicted_Risk", "mean")
    )
    .sort_values(
        "Avg_Model_Risk",
        ascending=False
    )
)

print("\nPROGRAM DASHBOARD")
print(program_dashboard.head(15))

# =====================================================
# EXECUTIVE SUMMARY
# =====================================================

print("\n==============================")
print("EXECUTIVE SUMMARY")
print("==============================")

print("Highest Risk County:", county_dashboard.index[0])
print("Highest Risk Agency:", agency_dashboard.index[0])
print("Highest Risk Program:", program_dashboard.index[0])
print("Highest Risk Vendor:", vendor_dashboard.index[0])
