"""
Training, calibration, and threshold selection for AeroCold LightGBM model.
Calibrates probabilities on the validation set, selects Medium/High risk thresholds,
and exports TreeSHAP explainer along with models/config.json.
"""

import json
from datetime import datetime
import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier, early_stopping, log_evaluation
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import roc_auc_score, precision_recall_curve, classification_report
import shap

from backend.app.config import (
    DATA_DIR,
    MODELS_DIR,
    FEATURE_NAMES,
    DEFAULT_THRESHOLDS,
    K_PERSISTENCE,
    SAFETY_RECOVERING_CAP,
    SAFETY_DOOR_OPEN_CAP,
    SAFETY_COOLING_OFF_TTX30_FLOOR,
    SAFETY_COOLING_OFF_TTX60_FLOOR,
)


def train_and_calibrate():
    print("Loading augmented feature sets...")
    train_df = pd.read_csv(DATA_DIR / "train_features.csv")
    val_df = pd.read_csv(DATA_DIR / "val_features.csv")

    X_train = train_df[FEATURE_NAMES]
    y_train = train_df["label"].to_numpy(dtype=int)

    X_val = val_df[FEATURE_NAMES]
    y_val = val_df["label"].to_numpy(dtype=int)

    print(f"X_train shape: {X_train.shape}, positive rate: {y_train.mean():.4f}")
    print(f"X_val shape: {X_val.shape}, positive rate: {y_val.mean():.4f}")

    # Base LightGBM classifier
    # Medical anomaly detection benefits from pos_scale_weight or class_weight
    neg_count = np.sum(y_train == 0)
    pos_count = np.sum(y_train == 1)
    scale_pos = max(1.0, float(neg_count / max(1, pos_count)))

    base_model = LGBMClassifier(
        n_estimators=400,
        learning_rate=0.04,
        max_depth=5,
        num_leaves=25,
        min_child_samples=20,
        scale_pos_weight=min(scale_pos, 8.0),  # balanced sensitivity
        random_state=42,
        verbosity=-1,
    )

    print("Fitting LightGBM with early stopping on validation split...")
    base_model.fit(
        X_train,
        y_train,
        eval_set=[(X_val, y_val)],
        callbacks=[early_stopping(stopping_rounds=30, verbose=False), log_evaluation(0)],
    )

    # Calibrate probabilities on validation set
    print("Calibrating probabilities via Sigmoid calibration...")
    calibrated_model = CalibratedClassifierCV(estimator=base_model, method="sigmoid", cv="prefit")
    calibrated_model.fit(X_val, y_val)

    # Validation predictions
    val_probs = calibrated_model.predict_proba(X_val)[:, 1]
    auc = roc_auc_score(y_val, val_probs)
    print(f"\n--- Validation ROC-AUC: {auc:.4f} ---")

    # Threshold selection on validation set
    precisions, recalls, thresholds = precision_recall_curve(y_val, val_probs)
    
    # Medium threshold: target ~80-85% recall
    target_recall = 0.82
    valid_idx = np.where(recalls >= target_recall)[0]
    if len(valid_idx) > 0:
        medium_thresh = float(thresholds[min(valid_idx[-1], len(thresholds) - 1)])
    else:
        medium_thresh = DEFAULT_THRESHOLDS["low"]
    
    # High threshold: target ~80% precision
    target_prec = 0.75
    valid_p_idx = np.where(precisions >= target_prec)[0]
    if len(valid_p_idx) > 0:
        high_thresh = float(thresholds[min(valid_p_idx[0], len(thresholds) - 1)])
    else:
        high_thresh = DEFAULT_THRESHOLDS["medium"]

    # Bound thresholds reasonably
    medium_thresh = round(float(np.clip(medium_thresh, 0.20, 0.40)), 3)
    high_thresh = round(float(np.clip(high_thresh, 0.50, 0.75)), 3)
    if high_thresh <= medium_thresh:
        high_thresh = medium_thresh + 0.25

    print(f"Selected Validation Thresholds -> Medium: {medium_thresh}, High: {high_thresh}")

    # Evaluate at chosen thresholds
    y_pred_med = (val_probs >= medium_thresh).astype(int)
    y_pred_high = (val_probs >= high_thresh).astype(int)
    print("\nReport at Medium Threshold:")
    print(classification_report(y_val, y_pred_med, digits=3))

    # Feature Importance
    importances = base_model.feature_importances_
    feat_imp = sorted(zip(FEATURE_NAMES, importances), key=lambda x: x[1], reverse=True)
    print("Top 8 Features by Importance:")
    for f, imp in feat_imp[:8]:
        print(f"  {f:25s}: {imp}")

    # Build TreeSHAP explainer
    print("\nBuilding TreeSHAP explainer...")
    explainer = shap.TreeExplainer(base_model)

    # Save artifacts
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(calibrated_model, MODELS_DIR / "calibrated_model.joblib")
    joblib.dump(base_model, MODELS_DIR / "base_model.joblib")
    joblib.dump(explainer, MODELS_DIR / "shap_explainer.joblib")

    config_dict = {
        "model_version": "1.0.0",
        "training_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "data_seed": 42,
        "feature_names": FEATURE_NAMES,
        "thresholds": {
            "low": medium_thresh,     # below medium_thresh is Low
            "medium": high_thresh,    # medium_thresh to high_thresh is Medium, >= high_thresh is High
        },
        "k_persistence": K_PERSISTENCE,
        "safety_rules": {
            "recovering_cap": SAFETY_RECOVERING_CAP,
            "door_open_cap": SAFETY_DOOR_OPEN_CAP,
            "cooling_off_ttx30_floor": SAFETY_COOLING_OFF_TTX30_FLOOR,
            "cooling_off_ttx60_floor": SAFETY_COOLING_OFF_TTX60_FLOOR,
        },
        "validation_metrics": {
            "roc_auc": round(float(auc), 4),
            "medium_threshold": medium_thresh,
            "high_threshold": high_thresh,
        }
    }

    with open(MODELS_DIR / "config.json", "w") as f:
        json.dump(config_dict, f, indent=2)

    print(f"Saved models, SHAP explainer, and config.json to {MODELS_DIR}")


if __name__ == "__main__":
    train_and_calibrate()
