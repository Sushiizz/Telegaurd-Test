"""
TeleGuard AI — Step 3: Agent Tools
=====================================
Deterministic Python functions the LLM orchestrator can call. These are
the "5 conceptual agents" made concrete — grouped by which agent role they
serve in comments below, though technically all just thin wrappers over
Step 2's store/roi_engine.

Critically: no tool here ever calls an LLM, and no tool ever returns a
number that isn't traceable straight back to the same model/SHAP/ROI math
the dashboard displays. That's what makes the agent's answers grounded
instead of hallucinated — every fact it states came from one of these
function calls, visible in the tool-call transparency log.
"""

from __future__ import annotations

from store import CustomerStore
import roi_engine

MAX_LIST_LIMIT = 50


# ---------------------------------------------------------------------------
# Risk Agent — WHO is at risk, at what scale
# ---------------------------------------------------------------------------

def list_at_risk_customers(
    store: CustomerStore,
    risk_level: str | None = None,
    contract_type: str | None = None,
    internet_service: str | None = None,
    min_churn_probability: float | None = None,
    min_ros: int | None = None,
    sort_by: str = "retention_opportunity_score",
    limit: int = 10,
) -> dict:
    limit = max(1, min(int(limit), MAX_LIST_LIMIT))
    result = store.list_customers(
        risk_level=risk_level,
        contract_type=contract_type,
        internet_service=internet_service,
        min_churn_probability=min_churn_probability,
        min_ros=min_ros,
        sort_by=sort_by,
        sort_dir="desc",
        page=1,
        page_size=limit,
    )
    return {
        "matched_total": result["total_items"],
        "returned": len(result["items"]),
        "customers": result["items"],
    }


def get_fleet_overview(store: CustomerStore) -> dict:
    return store.overview()


# ---------------------------------------------------------------------------
# Explainability Agent — WHY a customer is at risk
# ---------------------------------------------------------------------------

def explain_customer_risk(store: CustomerStore, customer_id: str) -> dict:
    base = store.get_base_score(customer_id)
    if base is None:
        return {"error": f"customer_id '{customer_id}' not found"}
    return {
        "customer_id": base["customer_id"],
        "churn_probability": base["churn_probability"],
        "risk_level": base["risk_level"],
        "top_drivers": base["top_drivers"],
    }


def get_customer_profile(store: CustomerStore, customer_id: str) -> dict:
    base = store.get_base_score(customer_id)
    raw = store.get_raw(customer_id)
    if base is None or raw is None:
        return {"error": f"customer_id '{customer_id}' not found"}
    return {
        **base,
        "internet_service": raw.get("InternetService"),
        "payment_method": raw.get("PaymentMethod"),
        "has_tech_support": raw.get("TechSupport"),
        "has_online_security": raw.get("OnlineSecurity"),
    }


# ---------------------------------------------------------------------------
# Retention Strategy / ROI Agent — WHAT to offer, and IF it's worth it
# ---------------------------------------------------------------------------

def get_recommended_action(store: CustomerStore, customer_id: str) -> dict:
    detail = store.get_detail(customer_id)
    if detail is None:
        return {"error": f"customer_id '{customer_id}' not found"}
    return {
        "customer_id": customer_id,
        "recommended_action": detail["recommended_action"],
    }


def simulate_retention_offer(
    store: CustomerStore,
    customer_id: str,
    discount_pct: float = 0,
    add_tech_support: bool = False,
) -> dict:
    raw = store.get_raw(customer_id)
    base = store.get_base_score(customer_id)
    if raw is None or base is None:
        return {"error": f"customer_id '{customer_id}' not found"}

    result = roi_engine.simulate_whatif(
        raw_customer=raw,
        current_risk=base["churn_probability"],
        cltv=base["cltv"],
        discount_pct=discount_pct,
        add_tech_support=add_tech_support,
        bundle=store.bundle,
    )
    return {"customer_id": customer_id, "cltv": base["cltv"], **result}


# ---------------------------------------------------------------------------
# Tool dispatch table — imported by orchestrator.py
# ---------------------------------------------------------------------------

TOOL_DISPATCH = {
    "list_at_risk_customers": list_at_risk_customers,
    "get_fleet_overview": get_fleet_overview,
    "explain_customer_risk": explain_customer_risk,
    "get_customer_profile": get_customer_profile,
    "get_recommended_action": get_recommended_action,
    "simulate_retention_offer": simulate_retention_offer,
}