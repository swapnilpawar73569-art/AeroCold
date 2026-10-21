"""
Live reading scoring engine for AeroCold.
Strictly causal, SQLite-backed, transparent safety layer overrides,
and persistent K=3 alert detection.
"""

import json
from pathlib import Path
from typing import Any, Dict, Optional
import joblib
import numpy as np
import pandas as pd

from backend.app.config import (
    MODELS_DIR,
    FEATURE_NAMES,
    DEFAULT_THRESHOLDS,
)
from backend.app.db import (
    _DB_LOCK,
    get_connection,
    get_unit_history,
    get_previous_two_readings,
)
from backend.app.features import features_for_latest
from backend.app.safety import apply_safety_rules
from backend.app.explain import build_explanation

# Global model and explainer cache
_MODEL = None
_EXPLAINER = None
_CONFIG = None


def get_model_and_config():
    global _MODEL, _EXPLAINER, _CONFIG
    if _CONFIG is None:
        config_path = MODELS_DIR / "config.json"
        if config_path.exists():
            with open(config_path, "r") as f:
                _CONFIG = json.load(f)
        else:
            _CONFIG = {
                "thresholds": DEFAULT_THRESHOLDS,
                "k_persistence": 3,
                "safety_rules": {},
            }

    if _MODEL is None:
        model_path = MODELS_DIR / "calibrated_model.joblib"
        if model_path.exists():
            _MODEL = joblib.load(model_path)

    if _EXPLAINER is None:
        explainer_path = MODELS_DIR / "shap_explainer.joblib"
        if explainer_path.exists():
            _EXPLAINER = joblib.load(explainer_path)

    return _MODEL, _EXPLAINER, _CONFIG


def score_reading(
    unit_id: str,
    ts: int,
    storage_c: float,
    ambient_c: float,
    door: int,
    cooling: int,
) -> Dict[str, Any]:
    """
    Scores a single sensor reading:
    1. Check for duplicates in SQLite. If found, return stored result.
    2. Insert raw reading into SQLite.
    3. Load causal unit history (ts <= current_ts, last 120 min).
    4. Compute features using features_for_latest.
    5. Evaluate calibrated model probability.
    6. Apply transparent safety layer.
    7. Classify into Low / Medium / High.
    8. Check K=3 persistence from stored rows.
    9. Build explanation and top factors via SHAP.
    10. Update row in SQLite and return clean JSON response.
    """
    model, explainer, config = get_model_and_config()
    medium_thresh = config["thresholds"]["low"]
    high_thresh = config["thresholds"]["medium"]

    with _DB_LOCK:
        conn = get_connection()
        try:
            # 1. Check for duplicate (unit_id, ts)
            cur = conn.cursor()
            cur.execute(
                """
                SELECT unit_id, ts, storage_c, ambient_c, door, cooling,
                       prob, model_prob, risk_level, time_to_excursion_min,
                       k3_flag, explanation, top_factors
                FROM readings
                WHERE unit_id = ? AND ts = ?
                """,
                (unit_id, ts),
            )
            existing = cur.fetchone()
            if existing and existing["prob"] is not None:
                # Duplicate found: return stored result without re-inserting
                row_dict = dict(existing)
                return {
                    "unit": row_dict["unit_id"],
                    "ts": row_dict["ts"],
                    "risk": row_dict["risk_level"],
                    "prob": round(float(row_dict["prob"]), 4) if row_dict["prob"] is not None else 0.0,
                    "model_prob": round(float(row_dict["model_prob"]), 4) if row_dict["model_prob"] is not None else 0.0,
                    "k3": row_dict["k3_flag"],
                    "ttx_min": row_dict["time_to_excursion_min"],
                    "explanation": row_dict["explanation"],
                    "top_factors": json.loads(row_dict["top_factors"]) if row_dict["top_factors"] else [],
                    "storage_c": row_dict["storage_c"],
                    "ambient_c": row_dict["ambient_c"],
                    "door": row_dict["door"],
                    "cooling": row_dict["cooling"],
                }

            # 2. Insert raw reading if not exists
            if not existing:
                cur.execute(
                    """
                    INSERT INTO readings (unit_id, ts, storage_c, ambient_c, door, cooling)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (unit_id, ts, storage_c, ambient_c, door, cooling),
                )
                conn.commit()
        finally:
            conn.close()

    # 3. Load unit history strictly up to ts (last 120 minutes)
    history_df = get_unit_history(unit_id, up_to_ts=ts, max_minutes=120)

    # 4. Extract features
    feats = features_for_latest(history_df)
    feat_df = pd.DataFrame([feats])[FEATURE_NAMES]

    # 5. Model prediction
    if model is not None:
        try:
            model_prob = float(model.predict_proba(feat_df)[0, 1])
        except Exception:
            model_prob = 0.05
    else:
        # Fallback heuristic if model not loaded
        model_prob = 0.05 if storage_c < 7.0 else 0.50

    # 6. Apply transparent safety layer
    final_prob, rule_reason, ttx_min = apply_safety_rules(
        model_prob=model_prob,
        history_df=history_df,
        config=config.get("safety_rules"),
    )

    # 7. Risk level classification
    if final_prob >= high_thresh:
        risk_level = "High"
    elif final_prob >= medium_thresh:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    # 8. K=3 Persistence rule from stored SQLite rows
    # True only if current reading AND previous two stored readings are Medium or High
    k3_flag = 0
    if risk_level in ("Medium", "High"):
        prev_rows = get_previous_two_readings(unit_id, ts)
        if len(prev_rows) >= 2:
            prev_alerts = [
                (r["risk_level"] in ("Medium", "High")) or ((r["prob"] or 0) >= medium_thresh)
                for r in prev_rows
            ]
            if all(prev_alerts):
                k3_flag = 1

    # 9. SHAP explanation and top factors
    shap_vals = None
    if explainer is not None:
        try:
            # TreeExplainer on base model
            raw_shap = explainer.shap_values(feat_df)
            if isinstance(raw_shap, list) and len(raw_shap) == 2:
                shap_vals = raw_shap[1][0]
            elif isinstance(raw_shap, np.ndarray):
                shap_vals = raw_shap[0] if raw_shap.ndim > 1 else raw_shap
        except Exception:
            shap_vals = None

    explanation, top_factors = build_explanation(
        shap_values=shap_vals,
        feature_dict=feats,
        risk_level=risk_level,
        rule_reason=rule_reason,
        ttx_min=ttx_min,
    )

    # 10. Update SQLite row
    with _DB_LOCK:
        conn = get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    UPDATE readings
                    SET prob = ?,
                        model_prob = ?,
                        risk_level = ?,
                        time_to_excursion_min = ?,
                        k3_flag = ?,
                        explanation = ?,
                        top_factors = ?
                    WHERE unit_id = ? AND ts = ?
                    """,
                    (
                        round(final_prob, 4),
                        round(model_prob, 4),
                        risk_level,
                        round(ttx_min, 1) if ttx_min is not None else None,
                        k3_flag,
                        explanation,
                        json.dumps(top_factors),
                        unit_id,
                        ts,
                    ),
                )
        finally:
            conn.close()

    return {
        "unit": unit_id,
        "ts": ts,
        "risk": risk_level,
        "prob": round(final_prob, 4),
        "model_prob": round(model_prob, 4),
        "k3": k3_flag,
        "ttx_min": round(ttx_min, 1) if ttx_min is not None else None,
        "explanation": explanation,
        "top_factors": top_factors,
        "storage_c": storage_c,
        "ambient_c": ambient_c,
        "door": door,
        "cooling": cooling,
    }
