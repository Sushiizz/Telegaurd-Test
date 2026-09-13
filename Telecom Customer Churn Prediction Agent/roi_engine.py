"""
TeleGuard AI — Step 2: Deterministic ROI & What-If Simulation Engine
=======================================================================
Everything in this file is plain, reproducible arithmetic — no LLM, no
black box. Two entry points:

  simulate_whatif()          -> powers POST /api/simulate (the interactive
                                 slider: "what if I offer X% off + tech
                                 support?"), scoped exactly to the payload
                                 fields the Core Contract defines.

  generate_recommended_action() -> powers the Next Best Action shown on
                                 GET /api/customer/{id}. It's a small grid
                                 search over candidate offers (discount x
                                 tech support x contract lock) that reuses
                                 the exact same cost/value math as the
                                 simulator, and picks the candidate that
                                 maximizes expected_net_value. "Best action"
                                 is therefore always explainable: it's
                                 whichever simulate_whatif() call scored
                                 highest.

Step 3's agent tools will call into this module directly rather than
re-implementing any ROI logic.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from data_prep import clean_data, engineer_features, encode_features
from scoring import align_features

# ---------------------------------------------------------------------------
# Business constants for offer costing — documented, not magic numbers.
# ---------------------------------------------------------------------------

DISCOUNT_COMMITMENT_MONTHS = 3   # a discount is costed over a 3-month window
TECH_SUPPORT_FREE_MONTHS = 3
TECH_SUPPORT_MONTHLY_VALUE = 15.0  # $ value of a month of tech support
CONTRACT_LOCK_ADMIN_COST = {0: 0.0, 12: 10.0, 24: 15.0}  # processing/incentive cost

DISCOUNT_GRID = [0, 5, 10, 15, 20, 25, 30]

# Which contract lengths are a genuine upgrade from the customer's current
# contract (0 = "leave contract unchanged" is always included).
CONTRACT_UPGRADE_PATHS: dict[str, list[int]] = {
    "Month-to-month": [0, 12, 24],
    "One year": [0, 24],
    "Two year": [0],
}


# ---------------------------------------------------------------------------
# Prediction (no SHAP — this is the fast path for grid search)
# ---------------------------------------------------------------------------

def _predict_probabilities(raw_rows: list[dict], bundle: dict) -> np.ndarray:
    """Batched churn-probability prediction for one or more hypothetical
    customer variants. Skips SHAP entirely (we only need the number, not
    driver explanations, for candidate offers) so a whole grid of offers
    can be scored in a single vectorized model call."""
    df = pd.DataFrame(raw_rows)
    df = clean_data(df)
    df = engineer_features(df)
    X, _ = encode_features(df)
    X = align_features(X, bundle["feature_names"])
    raw_probs = bundle["model"].predict_proba(X)[:, 1]
    calibrated = bundle["calibrator"].predict(raw_probs)
    return calibrated


# ---------------------------------------------------------------------------
# Offer application + costing
# ---------------------------------------------------------------------------

def modify_customer(
    raw_customer: dict,
    discount_pct: float = 0,
    add_tech_support: bool = False,
    new_contract_months: int | None = None,
) -> dict:
    """Return a copy of raw_customer with a hypothetical offer applied to
    its raw fields, so it can be re-run through the exact same
    clean -> engineer -> encode -> predict pipeline used for real scoring.

    - discount_pct: reduces MonthlyCharges by this percent.
    - add_tech_support: flips TechSupport to 'Yes' if it wasn't already.
    - new_contract_months: 12 or 24 to simulate locking a longer contract;
      None/0 leaves the current contract untouched.
    """
    modified = dict(raw_customer)
    base_charge = float(modified["MonthlyCharges"])
    modified["MonthlyCharges"] = round(base_charge * (1 - discount_pct / 100), 2)

    if add_tech_support:
        modified["TechSupport"] = "Yes"

    if new_contract_months == 12:
        modified["Contract"] = "One year"
    elif new_contract_months == 24:
        modified["Contract"] = "Two year"
    # new_contract_months in (None, 0) -> leave Contract untouched

    return modified


def compute_offer_cost(
    monthly_charges: float,
    discount_pct: float,
    add_tech_support: bool,
    new_contract_months: int | None = None,
) -> float:
    """Deterministic dollar cost of an offer, recognized over the
    commitment window it's tied to."""
    discount_cost = monthly_charges * (discount_pct / 100) * DISCOUNT_COMMITMENT_MONTHS
    tech_support_cost = (
        TECH_SUPPORT_FREE_MONTHS * TECH_SUPPORT_MONTHLY_VALUE if add_tech_support else 0.0
    )
    contract_cost = CONTRACT_LOCK_ADMIN_COST.get(new_contract_months or 0, 0.0)
    return round(discount_cost + tech_support_cost + contract_cost, 2)


# ---------------------------------------------------------------------------
# POST /api/simulate
# ---------------------------------------------------------------------------

def simulate_whatif(
    raw_customer: dict,
    current_risk: float,
    cltv: float,
    discount_pct: float,
    add_tech_support: bool,
    bundle: dict,
    new_contract_months: int | None = None,
) -> dict:
    """Apply one hypothetical offer and return the recalculated risk plus
    expected net retained value.

    expected_net_value = (risk reduction achieved) x cltv - (offer cost).
    A negative value is a legitimate, useful signal — it means the offer
    costs more than the revenue it's expected to protect for this specific
    customer, not an error condition.
    """
    modified = modify_customer(raw_customer, discount_pct, add_tech_support, new_contract_months)
    simulated_risk = float(_predict_probabilities([modified], bundle)[0])

    cost = compute_offer_cost(
        float(raw_customer["MonthlyCharges"]), discount_pct, add_tech_support, new_contract_months,
    )
    risk_reduction = max(current_risk - simulated_risk, 0.0)
    expected_net_value = round(risk_reduction * cltv - cost, 2)

    return {
        "current_risk": round(current_risk, 4),
        "simulated_risk": round(simulated_risk, 4),
        "risk_reduction": round(risk_reduction, 4),
        "offer_cost": cost,
        "expected_net_value": expected_net_value,
        "is_worth_it": expected_net_value > 0,
    }


# ---------------------------------------------------------------------------
# Next Best Action (grid search over the same ROI math)
# ---------------------------------------------------------------------------

def _build_title(discount_pct: int, add_tech_support: bool, contract_months: int) -> str:
    parts = []
    if contract_months:
        parts.append(f"{contract_months}-Month Loyalty Contract")
    if discount_pct:
        parts.append(f"{discount_pct}% Loyalty Discount")
    if add_tech_support:
        parts.append(f"{TECH_SUPPORT_FREE_MONTHS} Mo Free Tech Support")
    if not parts:
        return "Proactive Check-In Call (No-Cost Retention Outreach)"
    return " + ".join(parts)


def _message_preview(title: str) -> str:
    """Deterministic fallback copy. Step 3's Communication agent (LLM)
    personalizes tone/channel on top of this — this is the safe baseline
    the system falls back to on its own. Note: the Telco dataset has no
    customer name field, so the greeting is intentionally generic rather
    than inventing one."""
    return (
        f"Hi there — as a valued customer, we'd like to offer you: {title}. "
        f"This locks in a better rate and better support for your account. "
        f"Reply YES to activate, or call us to customize the offer."
    )


def generate_recommended_action(
    customer_id: str,
    raw_customer: dict,
    current_risk: float,
    cltv: float,
    bundle: dict,
) -> dict:
    """Grid-searches candidate offers and returns the one maximizing
    expected_net_value, shaped as the Core Contract's recommended_action
    object. Every candidate is scored with the exact same math
    simulate_whatif() uses, so results are reproducible and explainable —
    never an LLM guess."""
    has_tech_support = str(raw_customer.get("TechSupport", "")).strip() == "Yes"
    current_contract = str(raw_customer.get("Contract", "Month-to-month"))

    tech_support_options = [False] if has_tech_support else [False, True]
    contract_options = CONTRACT_UPGRADE_PATHS.get(current_contract, [0])

    candidates: list[tuple[int, bool, int]] = []
    for discount_pct in DISCOUNT_GRID:
        for add_ts in tech_support_options:
            for contract_months in contract_options:
                if discount_pct == 0 and not add_ts and contract_months == 0:
                    continue  # "do nothing" isn't an offer
                candidates.append((discount_pct, add_ts, contract_months))

    if not candidates:
        # Every lever already maxed out (2yr contract + tech support already
        # active). Fall back to discount-only options so there's always a
        # recommendation to show, even if it's modest.
        candidates = [(d, False, 0) for d in DISCOUNT_GRID if d > 0]

    modified_rows = [modify_customer(raw_customer, d, ts, cm) for d, ts, cm in candidates]
    simulated_risks = _predict_probabilities(modified_rows, bundle)

    best = None
    for (discount_pct, add_ts, contract_months), sim_risk in zip(candidates, simulated_risks):
        cost = compute_offer_cost(
            float(raw_customer["MonthlyCharges"]), discount_pct, add_ts, contract_months,
        )
        risk_reduction = max(current_risk - float(sim_risk), 0.0)
        net_value = risk_reduction * cltv - cost
        if best is None or net_value > best["net_value"]:
            best = {
                "discount_pct": discount_pct, "add_tech_support": add_ts,
                "contract_months": contract_months, "simulated_risk": float(sim_risk),
                "cost": cost, "net_value": net_value,
            }

    title = _build_title(best["discount_pct"], best["add_tech_support"], best["contract_months"])

    return {
        "title": title,
        "cost": best["cost"],
        "current_risk": round(current_risk, 4),
        "simulated_risk": round(best["simulated_risk"], 4),
        "expected_net_value": round(best["net_value"], 2),
        "message_preview": _message_preview(title),
    }