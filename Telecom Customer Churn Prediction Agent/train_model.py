"""
TeleGuard AI — Step 1: Model Training Pipeline
================================================
Trains an XGBoost churn classifier, calibrates its output probabilities
(churn_probability feeds directly into ROI math downstream, so raw
tree-ensemble scores aren't good enough — they need to be genuine
probabilities), builds a TreeSHAP explainer for driver attribution, and
serializes everything the API layer needs into a single model.pkl bundle.

Usage:
    python train_model.py --data /path/to/WA_Fn-UseC_-Telco-Customer-Churn.csv \
        --out ./model.pkl

Dataset: IBM Telco Customer Churn (Kaggle), ~7043 rows.
"""

from __future__ import annotations

import argparse
import json

import joblib
import numpy as np
import shap
import xgboost as xgb
from sklearn.calibration import calibration_curve
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (
    brier_score_loss,
    classification_report,
    roc_auc_score,
)
from sklearn.model_selection import cross_val_predict, train_test_split

from data_prep import prepare_dataset

RANDOM_STATE = 42


def build_model() -> xgb.XGBClassifier:
    """XGBoost config tuned for a ~7k-row tabular churn problem: shallow
    trees + regularization to avoid overfitting a dataset this size,
    scale_pos_weight to compensate for the ~27% positive class rate."""
    return xgb.XGBClassifier(
        n_estimators=350,
        max_depth=4,
        learning_rate=0.045,
        subsample=0.85,
        colsample_bytree=0.8,
        reg_alpha=0.3,
        reg_lambda=1.2,
        min_child_weight=3,
        eval_metric="logloss",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )


def train(csv_path: str, out_path: str) -> None:
    print(f"[1/6] Loading + engineering features from {csv_path} ...")
    X, y, feature_names, category_map, df_clean = prepare_dataset(csv_path)
    print(f"      {X.shape[0]} rows, {X.shape[1]} encoded features, "
          f"churn rate={y.mean():.1%}")

    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X, y, X.index, test_size=0.2, random_state=RANDOM_STATE, stratify=y,
    )

    pos_rate = y_train.mean()
    scale_pos_weight = (1 - pos_rate) / pos_rate

    print("[2/6] Generating out-of-fold predictions for calibration ...")
    oof_model = build_model()
    oof_model.set_params(scale_pos_weight=scale_pos_weight)
    oof_probs = cross_val_predict(
        oof_model, X_train, y_train, cv=5, method="predict_proba", n_jobs=1,
    )[:, 1]

    print("[3/6] Fitting isotonic calibrator on out-of-fold probabilities ...")
    calibrator = IsotonicRegression(out_of_bounds="clip")
    calibrator.fit(oof_probs, y_train)

    print("[4/6] Training final XGBoost model on full training set ...")
    model = build_model()
    model.set_params(scale_pos_weight=scale_pos_weight)
    model.fit(X_train, y_train)

    # --- Evaluation ---
    print("[5/6] Evaluating on held-out test set ...")
    raw_test_probs = model.predict_proba(X_test)[:, 1]
    calibrated_test_probs = calibrator.predict(raw_test_probs)

    auc = roc_auc_score(y_test, raw_test_probs)
    brier_raw = brier_score_loss(y_test, raw_test_probs)
    brier_calibrated = brier_score_loss(y_test, calibrated_test_probs)
    preds = (calibrated_test_probs >= 0.5).astype(int)

    print(f"      ROC-AUC:                 {auc:.4f}")
    print(f"      Brier score (raw):       {brier_raw:.4f}")
    print(f"      Brier score (calibrated):{brier_calibrated:.4f}  "
          f"(lower is better — calibration should reduce this)")
    print(classification_report(y_test, preds, target_names=["Stay", "Churn"]))

    frac_pos, mean_pred = calibration_curve(
        y_test, calibrated_test_probs, n_bins=10, strategy="quantile",
    )
    print("      Calibration check (predicted vs actual churn rate, "
          "10 quantile bins):")
    for p, a in zip(mean_pred, frac_pos):
        print(f"        predicted={p:.3f}  actual={a:.3f}")

    # --- SHAP ---
    print("[6/6] Building TreeSHAP explainer and serializing bundle ...")
    explainer = shap.TreeExplainer(model)

    # Small background sample kept in the bundle purely so scoring.py can
    # sanity-check SHAP additivity (base_value + sum(shap) ~= raw margin)
    # without needing the full training set shipped alongside the model.
    background_sample = X_train.sample(
        n=min(200, len(X_train)), random_state=RANDOM_STATE
    ).reset_index(drop=True)

    bundle = {
        "model": model,
        "calibrator": calibrator,
        "explainer": explainer,
        "feature_names": feature_names,
        "category_map": category_map,
        "background_sample": background_sample,
        "metadata": {
            "trained_rows": int(X_train.shape[0]),
            "test_auc": float(auc),
            "test_brier_calibrated": float(brier_calibrated),
            "churn_base_rate": float(y.mean()),
            "sklearn_contract_version": "1.0",
        },
    }
    joblib.dump(bundle, out_path)
    print(f"      Saved bundle -> {out_path}")

    # Human-readable metrics sidecar for the hackathon writeup / demo.
    metrics_path = out_path.rsplit(".", 1)[0] + "_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(bundle["metadata"], f, indent=2)
    print(f"      Saved metrics -> {metrics_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--data", required=True,
        help="Path to WA_Fn-UseC_-Telco-Customer-Churn.csv",
    )
    parser.add_argument(
        "--out", default="model.pkl", help="Output path for model.pkl",
    )
    args = parser.parse_args()
    train(args.data, args.out)