"""
TeleGuard AI — Customer Store
===============================
In-memory data layer sitting between the API and the ML core. Scores the
entire customer roster once (cheap: one batched model + SHAP pass) at
startup, and lazily computes+caches the more expensive Next Best Action
(a small grid search) only for customers whose Customer 360 view is
actually opened — keeping GET /api/customers fast even for a large roster.

Production note: this uses the same CSV as training as a stand-in for a
live customer database, which is a reasonable hackathon simplification.
Swapping this for a real DB/warehouse query only requires changing how
raw_df is loaded in main.py's startup — nothing else in the app depends
on it being a CSV.
"""

from __future__ import annotations

import pandas as pd

import roi_engine
import scoring


class CustomerStore:
    def __init__(self, bundle: dict, raw_df: pd.DataFrame):
        self.bundle = bundle

        df = raw_df.copy()
        df["customerID"] = df["customerID"].astype(str)

        self._raw_by_id: dict[str, dict] = {
            row["customerID"]: row.to_dict() for _, row in df.iterrows()
        }

        scored = scoring.score_dataframe(df, bundle)
        self._scores_by_id: dict[str, dict] = {s["customer_id"]: s for s in scored}
        self._action_cache: dict[str, dict] = {}

    def __len__(self) -> int:
        return len(self._scores_by_id)

    # -- lookups -----------------------------------------------------------

    def get_raw(self, customer_id: str) -> dict | None:
        return self._raw_by_id.get(customer_id)

    def get_base_score(self, customer_id: str) -> dict | None:
        return self._scores_by_id.get(customer_id)

    def get_detail(self, customer_id: str) -> dict | None:
        base = self.get_base_score(customer_id)
        if base is None:
            return None

        if customer_id not in self._action_cache:
            raw = self._raw_by_id[customer_id]
            self._action_cache[customer_id] = roi_engine.generate_recommended_action(
                customer_id=customer_id,
                raw_customer=raw,
                current_risk=base["churn_probability"],
                cltv=base["cltv"],
                bundle=self.bundle,
            )

        detail = dict(base)
        detail["recommended_action"] = self._action_cache[customer_id]
        return detail

    # -- listing / filtering / sorting --------------------------------------

    _VALID_SORT_FIELDS = {
        "retention_opportunity_score", "churn_probability", "cltv",
        "monthly_charges", "tenure_months",
    }

    def list_customers(
        self,
        risk_level: str | None = None,
        contract_type: str | None = None,
        search: str | None = None,
        internet_service: str | None = None,
        min_churn_probability: float | None = None,
        min_ros: int | None = None,
        sort_by: str = "retention_opportunity_score",
        sort_dir: str = "desc",
        page: int = 1,
        page_size: int = 25,
    ) -> dict:
        """internet_service / min_churn_probability / min_ros are additive
        filters beyond the REST contract's fields — added for Step 3's agent
        tools, which need to answer queries like 'top 5 fiber customers at
        risk' that reach past the summary JSON shape into raw attributes.
        The REST /api/customers endpoint simply never passes them."""
        rows = list(self._scores_by_id.values())

        if risk_level:
            rl = risk_level.upper()
            rows = [r for r in rows if r["risk_level"] == rl]
        if internet_service:
            rows = [
                r for r in rows
                if self._raw_by_id.get(r["customer_id"], {}).get("InternetService") == internet_service
            ]
        if min_churn_probability is not None:
            rows = [r for r in rows if r["churn_probability"] >= min_churn_probability]
        if min_ros is not None:
            rows = [r for r in rows if r["retention_opportunity_score"] >= min_ros]
        if contract_type:
            rows = [r for r in rows if r["contract_type"] == contract_type]
        if search:
            s = search.lower()
            rows = [r for r in rows if s in r["customer_id"].lower()]

        if sort_by not in self._VALID_SORT_FIELDS:
            sort_by = "retention_opportunity_score"
        rows.sort(key=lambda r: r[sort_by], reverse=(sort_dir.lower() != "asc"))

        total_items = len(rows)
        total_pages = max(1, (total_items + page_size - 1) // page_size)
        page = max(1, min(page, total_pages))
        start = (page - 1) * page_size
        page_rows = rows[start:start + page_size]

        return {
            "items": page_rows,
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
        }

    # -- fleet-level KPIs ----------------------------------------------------

    def overview(self) -> dict:
        rows = list(self._scores_by_id.values())
        n = len(rows)

        at_risk = [r for r in rows if r["risk_level"] in ("CRITICAL", "HIGH")]
        total_at_risk_revenue = sum(r["monthly_charges"] for r in at_risk)
        fleet_churn_rate = (sum(r["churn_probability"] for r in rows) / n) if n else 0.0
        average_ros = (sum(r["retention_opportunity_score"] for r in rows) / n) if n else 0.0
        # Potential value saved: CLTV-weighted churn exposure among at-risk
        # customers — i.e. the revenue genuinely in play if nothing is done.
        potential_value_saved = sum(r["cltv"] * r["churn_probability"] for r in at_risk)

        risk_distribution = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for r in rows:
            risk_distribution[r["risk_level"]] += 1

        return {
            "total_customers": n,
            "total_at_risk_revenue": round(total_at_risk_revenue, 2),
            "fleet_churn_rate": round(fleet_churn_rate, 4),
            "average_ros": round(average_ros, 1),
            "potential_value_saved": round(potential_value_saved, 2),
            "risk_distribution": risk_distribution,
        }