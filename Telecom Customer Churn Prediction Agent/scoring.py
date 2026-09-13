"""
TeleGuard AI — Step 1: Inference & Scoring Engine
===================================================
This is the module Step 2's FastAPI layer imports directly. It loads the
model.pkl bundle once (at API startup) and exposes score_customer() /
score_dataframe(), which turn raw Telco-schema customer rows into the
churn_probability, risk_level, cltv, retention_opportunity_score, and
top_drivers fields defined in the shared JSON contract.

NOTE ON SCOPE: `recommended_action` is intentionally NOT produced here.
That's the deterministic ROI/Simulation Engine's job (Step 2) — this
module's responsibility ends at "who is at risk, why, and how much are
they worth," which is exactly the WHO/WHY boundary of the product.

Business formulas (CLTV, Retention Opportunity Score) are deterministic
and documented inline so they can be defended in a judge Q&A — nothing
here is a black box.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import joblib

from data_prep import (
    clean_data,
    engineer_features,
    encode_features,
    humanize_feature,
    ACTIONABLE_CATEGORIES,
)

# ---------------------------------------------------------------------------
# Business constants (deterministic, tunable, and documented — not magic
# numbers). Centralizing them here means Step 2's simulation engine can
# import and reuse the exact same assumptions.
# ---------------------------------------------------------------------------

GROSS_MARGIN = 0.60          # Assumed contribution margin on monthly revenue
CHURN_HORIZON_MONTHS = 12    # churn_probability is interpreted as P(churn within 12mo)
MAX_EXPECTED_LIFETIME_MONTHS = 60  # Cap runaway CLTV for very low-risk customers
CLTV_VALUE_CAP = 3000.0      # CLTV level at which "value_score" saturates to 1.0
TOP_DRIVERS_N = 5

RISK_THRESHOLDS = [  # (min_probability, label), evaluated high to low
    (0.75, "CRITICAL"),
    (0.50, "HIGH"),
    (0.25, "MEDIUM"),
    (0.00, "LOW"),
]


# ---------------------------------------------------------------------------
# Bundle loading
# ---------------------------------------------------------------------------

def load_bundle(path: str = "model.pkl") -> dict:
    """Load the joblib bundle produced by train_model.py. Call once at API
    startup and reuse the returned dict across requests."""
    bundle = joblib.load(path)
    required_keys = {"model", "calibrator", "explainer", "feature_names",
                      "category_map"}
    missing = required_keys - set(bundle.keys())
    if missing:
        raise ValueError(f"model.pkl is missing expected keys: {missing}")
    return bundle


# ---------------------------------------------------------------------------
# Feature alignment (critical for single-row scoring)
# ---------------------------------------------------------------------------

def align_features(X: pd.DataFrame, feature_names: list[str]) -> pd.DataFrame:
    """One-hot encoding a single customer (or a small batch) won't produce
    columns for categorical levels absent from that batch. Reindex to the
    exact training-time feature order/set, filling any missing dummy
    columns with 0. This is what makes single-customer scoring safe."""
    return X.reindex(columns=feature_names, fill_value=0.0)


# ---------------------------------------------------------------------------
# Business formulas
# ---------------------------------------------------------------------------

def risk_level_from_prob(churn_probability: float) -> str:
    for threshold, label in RISK_THRESHOLDS:
        if churn_probability >= threshold:
            return label
    return "LOW"


def compute_cltv(monthly_charges: float, churn_probability: float) -> float:
    """Forward-looking customer lifetime value.

    churn_probability is treated as P(churn within CHURN_HORIZON_MONTHS).
    We convert that to an implied constant monthly hazard rate, then take
    expected remaining tenure as 1/hazard (standard geometric-survival
    expectation), capped to avoid runaway values for near-zero-risk
    customers. CLTV = monthly_charges x expected_remaining_months x margin.
    """
    p = np.clip(churn_probability, 1e-4, 1 - 1e-4)
    monthly_hazard = 1 - (1 - p) ** (1 / CHURN_HORIZON_MONTHS)
    expected_remaining_months = min(1 / monthly_hazard, MAX_EXPECTED_LIFETIME_MONTHS)
    cltv = monthly_charges * expected_remaining_months * GROSS_MARGIN
    return round(float(cltv), 2)


def compute_ros(
    churn_probability: float,
    cltv: float,
    top_drivers: list[dict],
) -> int:
    """Retention Opportunity Score (0-100): prioritizes customers who are
    simultaneously (a) urgent — likely to churn, (b) valuable — high CLTV,
    and (c) actionable — their top churn drivers are things a retention
    offer can actually fix (contract terms, missing services, billing
    friction), not fixed demographic attributes we can't change.

    Urgency is the primary multiplier (a customer who isn't going to churn
    has zero retention opportunity regardless of value). Value and
    actionability are secondary multipliers, each able to move the score
    by up to 50%, so a high-risk-but-low-value or high-risk-but-
    unaddressable customer still scores lower than a high-risk, high-
    value, addressable one.
    """
    value_score = min(cltv / CLTV_VALUE_CAP, 1.0)

    if top_drivers:
        actionable_count = sum(
            1 for d in top_drivers[:3] if d["category"] in ACTIONABLE_CATEGORIES
        )
        actionability_score = actionable_count / min(len(top_drivers), 3)
    else:
        actionability_score = 0.5  # neutral if no drivers available

    raw = (
        churn_probability
        * (0.5 + 0.5 * value_score)
        * (0.5 + 0.5 * actionability_score)
    )
    ros = round(float(np.clip(raw * 100, 0, 100)))
    return int(ros)


def get_top_drivers(
    shap_row: np.ndarray,
    feature_names: list[str],
    category_map: dict[str, str],
    top_n: int = TOP_DRIVERS_N,
) -> list[dict]:
    """Rank features by absolute SHAP impact for this customer and return
    the top N as contract-shaped driver dicts. Positive impact = pushes
    toward churn; negative = protective."""
    order = np.argsort(-np.abs(shap_row))[:top_n]
    drivers = []
    for i in order:
        col = feature_names[i]
        drivers.append({
            "feature": humanize_feature(col),
            "impact": round(float(shap_row[i]), 4),
            "category": category_map.get(col, "Other"),
        })
    return drivers


# ---------------------------------------------------------------------------
# Core scoring
# ---------------------------------------------------------------------------

def score_dataframe(raw_df: pd.DataFrame, bundle: dict) -> list[dict]:
    """Score a batch of raw Telco-schema customer rows. Returns a list of
    dicts matching the JSON contract, minus `recommended_action`
    (attached by Step 2's ROI engine)."""
    model = bundle["model"]
    calibrator = bundle["calibrator"]
    explainer = bundle["explainer"]
    feature_names = bundle["feature_names"]
    category_map = bundle["category_map"]

    df = clean_data(raw_df)
    df = engineer_features(df)
    X, _ = encode_features(df)
    X = align_features(X, feature_names)

    raw_probs = model.predict_proba(X)[:, 1]
    calibrated_probs = calibrator.predict(raw_probs)

    shap_values = explainer.shap_values(X)
    if isinstance(shap_values, list):  # binary-classifier SHAP can return [class0, class1]
        shap_values = shap_values[1]

    results = []
    for i in range(len(df)):
        churn_probability = round(float(calibrated_probs[i]), 4)
        monthly_charges = float(df.iloc[i]["MonthlyCharges"])
        top_drivers = get_top_drivers(
            shap_values[i], feature_names, category_map,
        )
        cltv = compute_cltv(monthly_charges, churn_probability)
        ros = compute_ros(churn_probability, cltv, top_drivers)

        results.append({
            "customer_id": str(df.iloc[i].get("customerID", f"row_{i}")),
            "tenure_months": int(df.iloc[i]["tenure"]),
            "monthly_charges": round(monthly_charges, 2),
            "contract_type": str(df.iloc[i]["Contract"]),
            "churn_probability": churn_probability,
            "risk_level": risk_level_from_prob(churn_probability),
            "cltv": cltv,
            "retention_opportunity_score": ros,
            "top_drivers": top_drivers,
        })
    return results


def score_customer(raw_customer: dict, bundle: dict) -> dict:
    """Score a single customer, given as a dict of raw Telco-schema fields
    (same columns as the Kaggle CSV, e.g. {"customerID": ..., "tenure": ...,
    "Contract": "Month-to-month", ...}). Returns one contract-shaped dict."""
    raw_df = pd.DataFrame([raw_customer])
    return score_dataframe(raw_df, bundle)[0]


if __name__ == "__main__":
    # Quick smoke test against a couple of hand-built customers, useful for
    # sanity-checking model.pkl right after training without booting the API.
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="model.pkl")
    args = parser.parse_args()

    bundle = load_bundle(args.model)

    sample_customer = {
        "customerID": "7590-VHVEG",
        "gender": "Female", "SeniorCitizen": 0, "Partner": "Yes",
        "Dependents": "No", "tenure": 1, "PhoneService": "No",
        "MultipleLines": "No phone service", "InternetService": "DSL",
        "OnlineSecurity": "No", "OnlineBackup": "Yes",
        "DeviceProtection": "No", "TechSupport": "No",
        "StreamingTV": "No", "StreamingMovies": "No",
        "Contract": "Month-to-month", "PaperlessBilling": "Yes",
        "PaymentMethod": "Electronic check", "MonthlyCharges": 29.85,
        "TotalCharges": "29.85", "Churn": "No",
    }

    import json
    print(json.dumps(score_customer(sample_customer, bundle), indent=2))