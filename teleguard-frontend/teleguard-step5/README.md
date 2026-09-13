# TeleGuard AI — Step 5: Customer 360, What-If Simulator & Agent Console

## What this adds
Three new pieces on top of Step 4, completing WHO → WHY → WHAT → IF → HOW:

- **Customer 360 panel** (`components/customer360/`) — replaces Step 4's
  placeholder. Fetches `GET /api/customer/{id}` on selection: header stats,
  a diverging SHAP driver chart (WHY), and the Next Best Action card (WHAT/IF).
- **What-If Simulator** — live sliders (`WhatIfSimulator.jsx`) call
  `POST /api/simulate` on a 350ms debounce as you drag, showing recalculated
  risk and expected net value reactively.
- **Agent Console** (`components/agent/`) — replaces the footer stub.
  A collapsible drawer calling `POST /api/agent/query`, rendering the
  conversation plus **tool-call transparency chips**: click one to see the
  exact input/output of the deterministic tool the agent called, so nothing
  the agent says is a black box.

The loop closes with one hand-off: the Next Best Action card's "Ask agent to
personalize" button opens the drawer with a pre-filled, on-topic query
referencing that exact customer — WHAT/IF flows straight into HOW.

## Setup
Same as Step 4 — nothing new to install beyond what Step 4 already added
(`framer-motion`, `lucide-react`, `recharts` were already in `package.json`).

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Running the full system end-to-end
1. **Step 1**: `python train_model.py --data <telco.csv> --out model.pkl`
2. **Step 2/3 backend**: set `GEMINI_API_KEY`, then from the
   Step 3 package's `src/`: `uvicorn main:app --reload --port 8000`
   (point `TELEGUARD_MODEL_PATH` / `TELEGUARD_DATA_PATH` at Step 1's output)
3. **This frontend**: `npm run dev`, with `.env.local` pointing at
   `http://localhost:8000`
4. Open `http://localhost:5173` — click a row to open Customer 360, drag
   the simulator sliders, expand the Agent Console and try "Draft SMS for
   the top 5 fiber customers at risk."

If the backend isn't running, the dashboard and table still work (Step 4's
mock-data fallback) — but the Customer 360 panel, simulator, and agent
console all need a live backend, since faking SHAP values, ROI math, or an
LLM's tool calls convincingly isn't possible without actually running them.
Those three show a clear inline error rather than fabricated numbers if the
API is unreachable.

## Design decisions worth knowing for judge Q&A

- **The simulator skips the "do nothing" API call.** At 0% discount with no
  tech support toggled, there's nothing to simulate — the panel shows a
  neutral prompt instead of calling the API with a no-op payload, mirroring
  the backend's own stance that "no offer" isn't a candidate action.
- **The tech-support toggle is never disabled**, even for customers who
  already have it — toggling it on for such a customer correctly simulates
  ~zero additional effect, which is itself an honest, informative result
  ("this customer already has tech support; offering it again does
  basically nothing") rather than a UI you have to special-case.
- **Tool-call transparency chips are collapsed by default** and only show
  raw JSON on demand — keeping the chat readable while making the full
  grounding data one click away for anyone who wants to verify a claim.
- **The "ask agent to personalize" hand-off pre-fills but never auto-sends.**
  The user still reviews and hits send themselves — a text field getting
  populated isn't a side-effecting action, but sending an outreach draft
  conceptually is, so it stays a deliberate step.
- **No fabricated success state.** If `/api/simulate` or `/api/agent/query`
  fails, the UI says so in the same panel rather than silently falling back
  to sample data the way the KPI strip and table do — those two are safe to
  demo with sample data because they're read-only displays; the simulator
  and agent are interactive and their numbers have to be real or clearly
  marked as unavailable.

## Verification caveat (same as Step 4)
No network access in this sandbox means no `npm install` / real Vite build
/ screenshot here either. Every file — including all of today's new
ones — was confirmed to parse and transpile cleanly via `tsx`; every error
surfaced was specifically an unresolved package (`react`, `lucide-react`,
`recharts`, `framer-motion`), never a syntax error. That rules out broken
JSX and bad imports but not visual/runtime issues. Please `npm install &&
npm run dev` and check it against a real backend before demo day.
