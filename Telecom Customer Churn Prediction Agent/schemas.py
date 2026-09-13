"""
TeleGuard AI — API Schemas
============================
Every model here mirrors a field in the system's shared JSON contract
verbatim. If the contract changes, this is the only file that should need
to change on the backend, and CustomerSummary/CustomerDetail's field names
are what the React frontend (Step 4/5) binds to directly.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

RiskLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class TopDriver(BaseModel):
    feature: str
    impact: float
    category: str


class RecommendedAction(BaseModel):
    title: str
    cost: float
    current_risk: float
    simulated_risk: float
    expected_net_value: float
    message_preview: str


class CustomerSummary(BaseModel):
    """Shape used by the paginated /api/customers list — the Prioritized
    Retention Table. Deliberately excludes top_drivers/recommended_action
    so the list endpoint stays fast for hundreds/thousands of rows."""

    customer_id: str
    tenure_months: int
    monthly_charges: float
    contract_type: str
    churn_probability: float
    risk_level: RiskLevel
    cltv: float
    retention_opportunity_score: int


class CustomerDetail(CustomerSummary):
    """Full Customer 360 shape returned by /api/customer/{id}."""

    top_drivers: list[TopDriver]
    recommended_action: RecommendedAction


class PaginatedCustomers(BaseModel):
    items: list[CustomerSummary]
    page: int
    page_size: int
    total_items: int
    total_pages: int


class OverviewResponse(BaseModel):
    total_customers: int
    total_at_risk_revenue: float
    fleet_churn_rate: float
    average_ros: float
    potential_value_saved: float
    risk_distribution: dict[str, int]


class SimulateRequest(BaseModel):
    customer_id: str
    discount_pct: float = Field(ge=0, le=100, description="0-100")
    add_tech_support: bool = False


class SimulateResponse(BaseModel):
    customer_id: str
    current_risk: float
    simulated_risk: float
    risk_reduction: float
    cltv: float
    offer_cost: float
    expected_net_value: float
    is_worth_it: bool


class ToolCallLog(BaseModel):
    """One tool invocation made by the orchestrator while answering a
    query — rendered by the frontend as a transparency chip so the user
    can see exactly which deterministic agent produced which fact."""

    tool: str
    input: dict
    output: dict


class AgentQueryRequest(BaseModel):
    query: str = Field(min_length=1, description="Natural-language request, e.g. 'Draft SMS for top 5 fiber customers at risk'")
    conversation_id: str | None = Field(
        default=None,
        description="Omit for a new conversation; pass back the value returned in a prior response to continue it.",
    )


class AgentQueryResponse(BaseModel):
    reply: str
    tool_calls: list[ToolCallLog]
    conversation_id: str