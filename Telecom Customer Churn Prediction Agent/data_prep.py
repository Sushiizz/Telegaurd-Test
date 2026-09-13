"""
TeleGuard AI — Step 1: Data Preparation & Feature Engineering
================================================================
Loads the IBM Telco Customer Churn dataset (Kaggle), cleans it, engineers
features that are both predictive AND business-interpretable (so SHAP
drivers translate directly into retention actions later), and produces
a fully-encoded design matrix ready for XGBoost.

This module is the single source of truth for feature definitions. Both
train_model.py (training) and scoring.py (inference) import from here so
training-serving skew is structurally impossible.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# 1. RAW COLUMN GROUPS (as they appear in the Kaggle CSV)
# ---------------------------------------------------------------------------

ID_COL = "customerID"
TARGET_COL = "Churn"

RAW_NUMERIC_COLS = ["tenure", "MonthlyCharges", "TotalCharges"]

RAW_BINARY_COLS = [
    "gender", "SeniorCitizen", "Partner", "Dependents",
    "PhoneService", "PaperlessBilling",
]

RAW_SERVICE_COLS = [
    "MultipleLines", "InternetService", "OnlineSecurity", "OnlineBackup",
    "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies",
]

RAW_CONTRACT_BILLING_COLS = ["Contract", "PaymentMethod"]

# ---------------------------------------------------------------------------
# 2. CATEGORY GROUPS — maps every base feature (raw or engineered) to a
#    business category. This is what turns a SHAP column name into
#    top_drivers[].category in the JSON contract, and lets scoring.py
#    decide which drivers are "actionable" for the Retention Opportunity
#    Score (e.g. Contract/Service/Billing are things we can change with an
#    offer; Demographic is not).
# ---------------------------------------------------------------------------

CATEGORY_GROUPS: dict[str, list[str]] = {
    "Contract": ["Contract", "is_month_to_month", "contract_risk_score"],
    "Billing": [
        "PaymentMethod", "PaperlessBilling", "is_electronic_check",
        "payment_risk_score", "MonthlyCharges", "TotalCharges",
    ],
    "Service": [
        "InternetService", "OnlineSecurity", "OnlineBackup",
        "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies",
        "PhoneService", "MultipleLines", "service_count", "is_fiber",
        "avg_charge_per_service",
    ],
    "Tenure": ["tenure", "tenure_bucket"],
    "Demographic": ["gender", "SeniorCitizen", "Partner", "Dependents"],
}

# Categories the business can actually intervene on via an offer.
# Used by scoring.py to weight the Retention Opportunity Score toward
# customers whose churn drivers are fixable, not just high-probability.
ACTIONABLE_CATEGORIES = {"Contract", "Service", "Billing"}

# Human-readable labels for base features, used to build top_drivers[].feature
FEATURE_LABELS: dict[str, str] = {
    "tenure": "Tenure (months)",
    "tenure_bucket": "Tenure Stage",
    "MonthlyCharges": "Monthly Charges",
    "TotalCharges": "Total Charges to Date",
    "Contract": "Contract",
    "is_month_to_month": "Month-to-Month Contract",
    "contract_risk_score": "Contract Risk Score",
    "PaymentMethod": "Payment Method",
    "PaperlessBilling": "Paperless Billing",
    "is_electronic_check": "Pays by Electronic Check",
    "payment_risk_score": "Payment Risk Score",
    "InternetService": "Internet Service",
    "OnlineSecurity": "Online Security",
    "OnlineBackup": "Online Backup",
    "DeviceProtection": "Device Protection",
    "TechSupport": "TechSupport",
    "StreamingTV": "Streaming TV",
    "StreamingMovies": "Streaming Movies",
    "PhoneService": "Phone Service",
    "MultipleLines": "Multiple Lines",
    "service_count": "Number of Add-On Services",
    "is_fiber": "Fiber Internet",
    "avg_charge_per_service": "Avg Charge per Service",
    "gender": "Gender",
    "SeniorCitizen": "Senior Citizen",
    "Partner": "Has Partner",
    "Dependents": "Has Dependents",
}


# ---------------------------------------------------------------------------
# 3. LOAD + CLEAN
# ---------------------------------------------------------------------------

def load_raw_data(csv_path: str) -> pd.DataFrame:
    """Load the raw Kaggle Telco Customer Churn CSV."""
    df = pd.read_csv(csv_path)
    return df


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Fix known data quality issues in the IBM Telco dataset."""
    df = df.copy()

    # TotalCharges is read as object because 11 rows have blank strings
    # (new customers with tenure=0). Coerce to numeric; impute blanks as
    # 0.0, since a customer with 0 tenure has paid nothing to date yet.
    df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce")
    df["TotalCharges"] = df["TotalCharges"].fillna(0.0)

    # SeniorCitizen ships as 0/1 int; normalize to Yes/No so it behaves
    # like every other binary categorical column downstream.
    if df["SeniorCitizen"].dtype != object:
        df["SeniorCitizen"] = df["SeniorCitizen"].map({0: "No", 1: "Yes"})

    df = df.drop_duplicates(subset=[ID_COL])
    df = df.reset_index(drop=True)
    return df


# ---------------------------------------------------------------------------
# 4. FEATURE ENGINEERING
# ---------------------------------------------------------------------------

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add engineered features that are predictive AND map cleanly to
    retention levers (so a SHAP driver on one of these translates directly
    into a recommended action in later steps)."""
    df = df.copy()

    # --- Tenure stage: early-life customers churn very differently from
    # tenured ones; bucketing captures the non-linearity explicitly.
    def _tenure_bucket(t: float) -> str:
        if t <= 6:
            return "0-6mo"
        elif t <= 12:
            return "6-12mo"
        elif t <= 24:
            return "1-2yr"
        elif t <= 48:
            return "2-4yr"
        return "4yr+"

    df["tenure_bucket"] = df["tenure"].apply(_tenure_bucket)

    # --- Contract risk: month-to-month is the single strongest churn lever
    # in this dataset and the most directly actionable (offer a lock-in).
    df["is_month_to_month"] = (df["Contract"] == "Month-to-month").astype(int)
    contract_risk_map = {"Month-to-month": 2, "One year": 1, "Two year": 0}
    df["contract_risk_score"] = df["Contract"].map(contract_risk_map)

    # --- Billing risk: electronic check correlates strongly with churn in
    # this dataset (proxy for lower engagement / no auto-pay commitment).
    df["is_electronic_check"] = (
        df["PaymentMethod"] == "Electronic check"
    ).astype(int)
    payment_risk_map = {
        "Electronic check": 3,
        "Mailed check": 2,
        "Bank transfer (automatic)": 1,
        "Credit card (automatic)": 1,
    }
    df["payment_risk_score"] = df["PaymentMethod"].map(payment_risk_map)

    # --- Service depth: count of subscribed add-on services. Low service
    # count + high monthly charge is a classic "paying a lot for little
    # value" churn signature, and each missing service is a directly
    # offerable upsell/retention lever.
    service_flags = [
        "OnlineSecurity", "OnlineBackup", "DeviceProtection",
        "TechSupport", "StreamingTV", "StreamingMovies",
    ]
    df["service_count"] = sum(
        (df[col] == "Yes").astype(int) for col in service_flags
    )
    df["is_fiber"] = (df["InternetService"] == "Fiber optic").astype(int)

    # Avoid divide-by-zero for customers with 0 services.
    df["avg_charge_per_service"] = df["MonthlyCharges"] / (
        df["service_count"] + 1
    )

    return df


# ---------------------------------------------------------------------------
# 5. ENCODING
# ---------------------------------------------------------------------------

CATEGORICAL_COLS = [
    "gender", "SeniorCitizen", "Partner", "Dependents", "PhoneService",
    "MultipleLines", "InternetService", "OnlineSecurity", "OnlineBackup",
    "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies",
    "Contract", "PaperlessBilling", "PaymentMethod", "tenure_bucket",
]

NUMERIC_COLS = [
    "tenure", "MonthlyCharges", "TotalCharges", "is_month_to_month",
    "contract_risk_score", "is_electronic_check", "payment_risk_score",
    "service_count", "is_fiber", "avg_charge_per_service",
]


def encode_features(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """One-hot encode all categoricals (no dropped baseline level — tree
    models don't need dummy-variable collinearity avoided, and keeping
    every level means SHAP can attribute impact to e.g. 'TechSupport: No'
    specifically, which is what the product needs for driver explanations).
    Returns (X, feature_names)."""
    df = df.copy()

    encoded = pd.get_dummies(
        df[CATEGORICAL_COLS], columns=CATEGORICAL_COLS, prefix_sep="_",
        drop_first=False,
    )
    X = pd.concat([df[NUMERIC_COLS], encoded], axis=1)
    X = X.astype(float)
    feature_names = list(X.columns)
    return X, feature_names


def build_category_map(feature_names: list[str]) -> dict[str, str]:
    """Map every encoded feature column (raw numeric or one-hot) to its
    business category, by matching against CATEGORY_GROUPS base names."""
    base_lookup: dict[str, str] = {}
    for category, bases in CATEGORY_GROUPS.items():
        for base in bases:
            base_lookup[base] = category

    category_map: dict[str, str] = {}
    for col in feature_names:
        if col in base_lookup:
            category_map[col] = base_lookup[col]
            continue
        # One-hot column: strip "<base>_<level>" to find its base.
        matched = False
        for base in sorted(base_lookup, key=len, reverse=True):
            if col.startswith(base + "_"):
                category_map[col] = base_lookup[base]
                matched = True
                break
        if not matched:
            category_map[col] = "Other"
    return category_map


def humanize_feature(col: str) -> str:
    """Turn an encoded column name into a display string, e.g.
    'Contract_Month-to-month' -> 'Contract: Month-to-month'
    'TechSupport_No'          -> 'TechSupport: No'
    'tenure'                  -> 'Tenure (months)'"""
    if col in FEATURE_LABELS:
        return FEATURE_LABELS[col]

    for base in sorted(FEATURE_LABELS, key=len, reverse=True):
        if col.startswith(base + "_"):
            level = col[len(base) + 1:]
            return f"{FEATURE_LABELS[base]}: {level}"

    # Fallback: still human-ish rather than a raw encoded slug.
    return col.replace("_", ": ", 1).replace("_", " ")


def prepare_dataset(csv_path: str):
    """End-to-end: raw CSV -> (X, y, feature_names, category_map, df_clean).
    df_clean is retained so downstream code can pull raw display fields
    (customerID, Contract, MonthlyCharges, tenure) without re-decoding
    one-hot columns."""
    df = load_raw_data(csv_path)
    df = clean_data(df)
    df = engineer_features(df)

    y = (df[TARGET_COL] == "Yes").astype(int)
    X, feature_names = encode_features(df)
    category_map = build_category_map(feature_names)

    return X, y, feature_names, category_map, df