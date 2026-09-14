# TeleGuard AI

TeleGuard AI is a customer-retention command platform for telecom teams. It
combines calibrated churn prediction, SHAP explanations, deterministic offer
economics, a Customer 360 workflow, and a grounded Gemini tool-using agent.
The product flow is:

**WHO** is at risk -> **WHY** are they at risk -> **WHAT** should we offer ->
**IF** the offer is applied, is it worth it -> **HOW** should we communicate it?

This repository contains both the FastAPI/ML backend and the React dashboard.
It is a local-demo and hackathon-grade implementation: the supplied IBM Telco
CSV acts as both the training roster and the in-memory customer store. The
backend scores the full roster during startup; it does not connect to a live
CRM, billing system, or customer database.

## System Architecture

```text
IBM Telco CSV
  |
  +--> data_prep.py --> train_model.py --> model.pkl + model_metrics.json
  |                                      (XGBoost + isotonic calibration + SHAP)
  |
  +--> FastAPI startup --> scoring.py --> CustomerStore (in memory)
                 |             |
                 |             +--> overview and customer list
                 |             +--> Customer 360 + SHAP drivers
                 |             +--> roi_engine.py (lazy Next Best Action)
                 |             +--> orchestrator.py (optional Gemini agent)
                 |
                 +--> React/Vite dashboard
```

The core retention workflow is deterministic: `scoring.py` calculates churn
risk, CLTV, and ROS; `roi_engine.py` recalculates hypothetical offers and
selects the highest-value action. Gemini is optional and is used only to
interpret questions, call the deterministic tools, and draft communication.

## Features

- Calibrated XGBoost churn classifier with TreeSHAP driver attribution.
- Customer-level risk, CLTV, and Retention Opportunity Score (ROS).
- Fleet KPIs and a prioritized, filterable retention table.
- Customer 360 view with churn drivers and a deterministic Next Best Action.
- What-If simulator for discounts and free technical support.
- Gemini function-calling agent with visible deterministic tool inputs/outputs.
- Safe frontend fallback data for the read-only dashboard while the API is down.

## Repository Layout

```text
Telecom Customer Churn Prediction Agent/
|-- config.py                         Backend paths and environment settings
|-- data_prep.py                      Cleaning, feature engineering, encoding
|-- train_model.py                    XGBoost training and bundle creation
|-- scoring.py                        Inference, SHAP, CLTV, and ROS
|-- roi_engine.py                     Offer simulation and Next Best Action
|-- store.py                          In-memory scored customer store
|-- schemas.py                        FastAPI/Pydantic response contracts
|-- tools.py                          Deterministic agent tools
|-- orchestrator.py                   Gemini function-calling loop
|-- main.py                           FastAPI application and routes
|-- requirements.txt                  Python dependencies
|-- model_metrics.json                Optional metrics sidecar
|-- WA_Fn-UseC_-Telco-Customer-Churn.csv
|-- archive/                          Archived copy of the source CSV
`-- ../teleguard-frontend/teleguard-step5/
    |-- package.json                  Vite/React dependencies and scripts
    `-- src/                           Dashboard, hooks, components, and API client
```

## Prerequisites

- Python 3.10 or newer.
- Node.js 18 or newer and npm.
- The IBM Telco Customer Churn CSV. A copy is already included in this repo.
- A Gemini API key only when using the retention agent endpoint.

## Quick Start

The backend must have a trained `model.pkl` before it can start. Run these
commands from the `Telecom Customer Churn Prediction Agent` directory.

### 1. Create the Python environment

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Train the model bundle

Use the included dataset:

```bash
python train_model.py --data ./WA_Fn-UseC_-Telco-Customer-Churn.csv --out ./model.pkl
```

This creates `model.pkl` and `model_metrics.json` (the sidecar name is based
on the output filename). The bundle contains:

```text
model             Fitted XGBClassifier
calibrator        IsotonicRegression probability calibrator
explainer         TreeSHAP explainer
feature_names     Training-time encoded feature order
category_map      Feature-to-business-category mapping
background_sample Small reference sample
metadata          AUC, calibrated Brier score, base rate, and row count
```

Training prints ROC-AUC, raw and calibrated Brier scores, a classification
report, and a calibration check. Results vary slightly with library versions;
the standard dataset commonly produces an ROC-AUC in the 0.84-0.86 range.

### 3. Start the API

```bash
uvicorn main:app --reload --port 8000
```

The startup lifecycle loads the model, reads the CSV, scores the full roster
once, and keeps the resulting records in memory. Check it with:

```bash
curl http://localhost:8000/health
```

Expected shape:

```json
{"status":"ok","customers_loaded":7043}
```

### 4. Start the dashboard

Open a second terminal and run this from the frontend directory:

```bash
cd ../teleguard-frontend/teleguard-step5
npm install
npm run dev
```

Open `http://localhost:5173`. The dashboard client defaults to the deployed
backend at `https://telegaurd-backend.onrender.com`. For local end-to-end
development, configure the frontend as shown below so it calls your local API.

## Configuration

The backend loads `.env` from its own directory. Relative paths are resolved
relative to that directory.

| Variable | Default | Purpose |
| --- | --- | --- |
| `TELEGUARD_MODEL_PATH` | `model.pkl` | Model bundle path |
| `TELEGUARD_DATA_PATH` | `WA_Fn-UseC_-Telco-Customer-Churn.csv` | Customer roster path |
| `TELEGUARD_CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed origins |
| `GEMINI_API_KEY` | unset | Required only for `/api/agent/query` |
| `TELEGUARD_AGENT_MODEL` | `gemini-3.6-flash` | Gemini model name |

The frontend reads `VITE_API_URL` from
`teleguard-frontend/teleguard-step5/.env.local`. For the local backend, use:

```dotenv
VITE_API_URL=http://localhost:8000
```

Do not commit API keys or local `.env` files.

## Backend API

Interactive API documentation is available while the server is running at
`http://localhost:8000/docs`.

### `GET /api/overview`

Returns fleet KPIs:

```json
{
  "total_customers": 7043,
  "total_at_risk_revenue": 138902.45,
  "fleet_churn_rate": 0.2654,
  "average_ros": 34.2,
  "potential_value_saved": 96210.88,
  "risk_distribution": {"CRITICAL": 412, "HIGH": 890, "MEDIUM": 1560, "LOW": 4181}
}
```

### `GET /api/customers`

Returns paginated customer summaries. Supported query parameters:

- `risk_level`: `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
- `contract_type`: `Month-to-month`, `One year`, or `Two year`.
- `search`: substring match on `customer_id`.
- `sort_by`: `retention_opportunity_score`, `churn_probability`, `cltv`,
  `monthly_charges`, or `tenure_months`.
- `sort_dir`: `asc` or `desc`.
- `page`: one-based page number.
- `page_size`: 1-200, default 25.

Example:

```text
GET /api/customers?risk_level=HIGH&sort_by=cltv&sort_dir=desc&page=1&page_size=25
```

The Gemini agent can apply additional internal filters such as
`internet_service`, `min_churn_probability`, and `min_ros` through its
deterministic tool layer; those are not query parameters exposed by this REST
route.

### `GET /api/customer/{customer_id}`

Returns the full Customer 360 record, including `top_drivers` and a lazily
computed `recommended_action`. Unknown customers return HTTP 404.

### `POST /api/simulate`

Recalculates risk and offer economics for a hypothetical retention offer:

```json
{
  "customer_id": "9305-CKSKC",
  "discount_pct": 10,
  "add_tech_support": true
}
```

The response includes `current_risk`, `simulated_risk`, `risk_reduction`,
`offer_cost`, `expected_net_value`, and `is_worth_it`. A negative net value is
valid: it means the offer costs more than the expected value it protects.

### `POST /api/agent/query`

Accepts a natural-language query and optionally a previous
`conversation_id`:

```json
{
  "query": "Draft SMS for the top 5 fiber customers at risk",
  "conversation_id": null
}
```

The response contains the grounded `reply`, the returned `conversation_id`,
and a `tool_calls` log containing each tool's exact input and output.
Without `GEMINI_API_KEY`, this route returns HTTP 503; the other API routes do
not require Gemini.

### `GET /health`

Reports API readiness and the number of customers loaded into memory.

## Model and Business Logic

### Data preparation

`data_prep.py` is shared by training, inference, and simulation so the same
cleaning and feature definitions are used in every path. It:

1. Converts blank `TotalCharges` values to zero.
2. Normalizes `SeniorCitizen` to a categorical Yes/No value.
3. Removes duplicate `customerID` records.
4. Engineers tenure, contract, billing, service-count, fiber, and average
   charge-per-service features.
5. One-hot encodes categorical fields and returns the business category map
   used to humanize SHAP output.

### Churn scoring

`train_model.py` trains a regularized XGBoost classifier using a stratified
80/20 split. Out-of-fold predictions fit an isotonic calibrator, because the
probability is later used as an input to CLTV and ROI calculations. The model
bundle also stores a TreeSHAP explainer.

`scoring.py` returns:

- `churn_probability`: calibrated probability of churn within the 12-month
  business horizon.
- `risk_level`: LOW below 25%, MEDIUM from 25%, HIGH from 50%, and CRITICAL
  from 75%.
- `cltv`: monthly charges multiplied by expected remaining tenure and a 60%
  margin, with expected tenure capped at 60 months.
- `retention_opportunity_score`: 0-100 score combining urgency, value, and
  whether the top drivers belong to actionable Contract, Service, or Billing
  categories.
- `top_drivers`: the five features with the largest absolute SHAP impact.

### Offer simulation and Next Best Action

`roi_engine.py` applies a hypothetical offer to a copy of the raw customer,
runs the same feature and prediction pipeline, and calculates:

```text
expected_net_value = risk_reduction * CLTV - offer_cost
```

Offer cost includes a three-month discount commitment, three months of free
technical support when selected, and a small contract-lock administration
cost. The Next Best Action is a grid search across discounts, technical
support, and eligible contract upgrades; it chooses the candidate with the
highest expected net value. No LLM is involved in this calculation.

## Agent Grounding

The orchestrator in `orchestrator.py` gives Gemini six deterministic tools:

1. `list_at_risk_customers`
2. `get_fleet_overview`
3. `explain_customer_risk`
4. `get_customer_profile`
5. `get_recommended_action`
6. `simulate_retention_offer`

The agent is instructed not to invent IDs, probabilities, dollar values, or
drivers. It must call tools for specific facts, and the frontend exposes the
tool-call log so users can inspect the evidence behind a response. Conversation
history is held in process memory and is lost when the API restarts.

## Frontend Workflow

The Vite/React dashboard is composed around these flows:

- **Overview:** fleet KPIs and risk mix.
- **Prioritized Retention Table:** filter, sort, paginate, and select customers.
- **Customer 360:** inspect profile metrics and SHAP drivers.
- **Next Best Action:** review deterministic offer economics and message copy.
- **What-If Simulator:** change discount and technical-support inputs; requests
  are debounced by 350 ms while dragging.
- **Retention Agent:** ask fleet or customer questions and inspect tool calls.

When `/api/overview` or `/api/customers` is unavailable, the dashboard shows
bundled sample data and an API-unavailable banner. Customer 360, simulation,
and agent requests show an error instead of fabricating interactive results.
This means the overview and table can be explored without the backend, but
model-derived details and actions require a running API.

## Development Checks

Backend import/compile check:

```bash
python -m compileall *.py
```

Frontend production build:

```bash
cd ../teleguard-frontend/teleguard-step5
npm run build
```

The project currently does not include an automated test suite. Before a
production deployment, add tests for feature parity between training and
inference, threshold boundaries, ROI calculations, API validation, and the
agent's tool-dispatch behavior.

## Troubleshooting

**API fails because `model.pkl` is missing**

Run the training command first, or set `TELEGUARD_MODEL_PATH` to an existing
bundle. The bundle must contain `model`, `calibrator`, `explainer`,
`feature_names`, and `category_map`.

**Frontend shows sample data**

Confirm the API is running on port 8000, open `/health`, and verify
`VITE_API_URL` points to the API. Also check that the backend CORS list
contains the Vite origin.

**Agent returns 503**

Set `GEMINI_API_KEY` in the backend environment and restart Uvicorn. The agent
is intentionally optional; the dashboard's model, scoring, and simulator
routes work without it.

**Customer lookup returns 404**

Use an ID present in the configured CSV. The demo store uses the CSV's
`customerID` column as the primary key.

## Production Considerations

This implementation is designed for a local demo, not direct production use.
Important next steps would be:

- Replace the CSV-backed in-memory store with a database or warehouse.
- Persist conversations and use an authenticated user/session boundary.
- Add authentication, authorization, rate limiting, and request auditing.
- Pin the unpinned FastAPI, Uvicorn, and Gemini packages after verification.
- Add monitoring for model drift, calibration quality, API latency, and tool
  failures.
- Review the business assumptions behind margin, CLTV, discount cost, and
  intervention effectiveness with the retention team.
- Treat churn probabilities as decision support, not guarantees about a person.

## Data and Privacy

The included dataset is the IBM Telco Customer Churn dataset commonly
distributed through Kaggle. It contains account attributes and no customer
name field, so the system intentionally uses generic customer greetings.
Handle any real customer data according to the applicable privacy, retention,
and access-control requirements.