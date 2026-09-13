# TeleGuard AI — Step 1: Data, Feature Engineering, XGBoost & SHAP Engine

## What this produces
Running the pipeline below generates `model.pkl` — a single bundle containing
everything Step 2's FastAPI layer needs:

```
model.pkl
 ├── model            (fitted XGBClassifier)
 ├── calibrator        (IsotonicRegression — turns raw scores into true probabilities)
 ├── explainer         (shap.TreeExplainer over the model)
 ├── feature_names     (exact column order the model expects)
 ├── category_map      (feature -> business category, e.g. "Contract", "Service")
 ├── background_sample (small reference sample for SHAP sanity checks)
 └── metadata           (test AUC, Brier score, churn base rate)
```

## Setup

```bash
pip install -r requirements.txt
```

Download the dataset from Kaggle: **IBM Telco Customer Churn**
(`WA_Fn-UseC_-Telco-Customer-Churn.csv`) and note its path.

## Train

```bash
cd src
python train_model.py --data /path/to/WA_Fn-UseC_-Telco-Customer-Churn.csv --out model.pkl
```

This prints ROC-AUC, Brier score (before/after calibration), a classification
report, and a calibration curve check — keep this output, it's good hackathon
demo material ("our probabilities are genuinely calibrated, not just ranked").

Expect roughly: **ROC-AUC ~0.84–0.86**, calibrated Brier score noticeably
lower than raw, on the standard 80/20 split. Exact numbers vary slightly by
XGBoost/SHAP version.

## Smoke-test scoring

```bash
python scoring.py --model model.pkl
```

Scores one hard-coded sample customer end-to-end and prints the resulting
JSON — useful to confirm the bundle loads and produces contract-shaped
output before wiring up FastAPI in Step 2.

## What's deliberately NOT here
`recommended_action` (the offer, its cost, simulated risk, expected net
value, message preview) is intentionally absent from `score_customer()`'s
output. That's the deterministic ROI/Simulation Engine's job — Step 2. This
keeps the WHO/WHY layer (this step) cleanly separated from the WHAT/IF layer
(next step), which also means you can unit-test and demo them independently.

## Design decisions worth knowing for judge Q&A
- **Calibration**: XGBoost's raw `predict_proba` is a good *ranking* but a
  mediocre *probability*. Since `churn_probability` feeds CLTV and ROI math
  downstream, we isotonic-calibrate it using out-of-fold predictions, so the
  number is defensible as an actual probability, not just a score.
- **One-hot without dropped baseline**: for tree models this doesn't cause
  the multicollinearity problems it would in linear models, and it lets SHAP
  attribute impact to a specific level (e.g. `TechSupport: No`) instead of
  an ambiguous reference category.
- **CLTV**: converts the 12-month churn probability into an implied monthly
  hazard rate, then values expected remaining tenure at a 60% margin, capped
  at 5 years. Fully deterministic — no black box.
- **Retention Opportunity Score**: urgency (churn probability) gates the
  score; value (CLTV) and actionability (are the top drivers things an offer
  can fix?) each modulate it by up to ±50%. A high-risk customer with only
  demographic drivers (nothing offerable) scores lower than an equally
  high-risk customer whose top driver is "Contract: Month-to-month."