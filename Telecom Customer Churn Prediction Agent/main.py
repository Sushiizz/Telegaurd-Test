"""
TeleGuard AI — Step 2: FastAPI Application
=============================================
Boots the churn model + customer roster once at startup (scoring.load_bundle
+ CSV -> CustomerStore), then exposes the REST surface defined in the
system's Core Contract. Step 3 adds POST /api/agent/query on top of this
same app instance and the same CustomerStore — nothing here needs to
change for that.

Run:
    cd src
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import config
import orchestrator
import roi_engine
import scoring
from schemas import (
    AgentQueryRequest,
    AgentQueryResponse,
    CustomerDetail,
    OverviewResponse,
    PaginatedCustomers,
    SimulateRequest,
    SimulateResponse,
)
from store import CustomerStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("teleguard")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading model bundle from %s ...", config.MODEL_PATH)
    bundle = scoring.load_bundle(config.MODEL_PATH)

    logger.info("Loading customer roster from %s ...", config.DATA_PATH)
    raw_df = pd.read_csv(config.DATA_PATH)

    logger.info("Scoring %d customers (model + SHAP pass) ...", len(raw_df))
    app.state.store = CustomerStore(bundle, raw_df)
    app.state.agent_sessions = {}  # conversation_id -> Gemini message history (in-memory, demo-scope)
    logger.info("TeleGuard AI ready — %d customers scored.", len(app.state.store))

    yield

    logger.info("Shutting down TeleGuard AI.")


app = FastAPI(
    title="TeleGuard AI",
    description="Autonomous Customer Retention Command Platform — API layer",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_store() -> CustomerStore:
    return app.state.store


# ---------------------------------------------------------------------------
# Executive KPIs
# ---------------------------------------------------------------------------

@app.get("/api/overview", response_model=OverviewResponse)
def get_overview():
    return get_store().overview()


# ---------------------------------------------------------------------------
# Prioritized Retention Table
# ---------------------------------------------------------------------------

@app.get("/api/customers", response_model=PaginatedCustomers)
def list_customers(
    risk_level: str | None = Query(default=None, description="LOW | MEDIUM | HIGH | CRITICAL"),
    contract_type: str | None = Query(default=None, description="Month-to-month | One year | Two year"),
    search: str | None = Query(default=None, description="Substring match on customer_id"),
    sort_by: str = Query(default="retention_opportunity_score"),
    sort_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=config.DEFAULT_PAGE_SIZE, ge=1, le=config.MAX_PAGE_SIZE),
):
    return get_store().list_customers(
        risk_level=risk_level,
        contract_type=contract_type,
        search=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
    )


# ---------------------------------------------------------------------------
# Customer 360
# ---------------------------------------------------------------------------

@app.get("/api/customer/{customer_id}", response_model=CustomerDetail)
def get_customer(customer_id: str):
    detail = get_store().get_detail(customer_id)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Customer '{customer_id}' not found")
    return detail


# ---------------------------------------------------------------------------
# What-If Retention Simulator
# ---------------------------------------------------------------------------

@app.post("/api/simulate", response_model=SimulateResponse)
def simulate(payload: SimulateRequest):
    store = get_store()
    raw = store.get_raw(payload.customer_id)
    base = store.get_base_score(payload.customer_id)
    if raw is None or base is None:
        raise HTTPException(
            status_code=404, detail=f"Customer '{payload.customer_id}' not found",
        )

    result = roi_engine.simulate_whatif(
        raw_customer=raw,
        current_risk=base["churn_probability"],
        cltv=base["cltv"],
        discount_pct=payload.discount_pct,
        add_tech_support=payload.add_tech_support,
        bundle=store.bundle,
    )
    return {"customer_id": payload.customer_id, "cltv": base["cltv"], **result}


# ---------------------------------------------------------------------------
# Autonomous Retention Agent
# ---------------------------------------------------------------------------

@app.post("/api/agent/query", response_model=AgentQueryResponse)
def agent_query(payload: AgentQueryRequest):
    store = get_store()
    conversation_id = payload.conversation_id or str(uuid.uuid4())
    history = app.state.agent_sessions.get(conversation_id, [])

    try:
        result = orchestrator.run_agent_query(payload.query, store, history=history)
    except RuntimeError as e:
        # Missing GEMINI_API_KEY, etc. — a config problem, not a customer
        # error, so this is a 503 (service unavailable) rather than a 400/404.
        raise HTTPException(status_code=503, detail=str(e))

    app.state.agent_sessions[conversation_id] = result["messages"]

    return {
        "reply": result["reply"],
        "tool_calls": result["tool_calls"],
        "conversation_id": conversation_id,
    }


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    store = get_store()
    return {"status": "ok", "customers_loaded": len(store)}