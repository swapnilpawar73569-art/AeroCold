"""
Explanation generator using TreeSHAP and domain vocabulary.
Translates top SHAP contributions and safety rule triggers into
plain-English, human-readable operator sentences.
"""

import json
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd
from backend.app.config import FEATURE_NAMES

# Domain translation for feature names and impact
FEATURE_DESCRIPTIONS = {
    "storage_c": ("Storage temperature", "elevated chamber temperature"),
    "ambient_c": ("Ambient temperature", "hot surrounding room temperature"),
    "dist_to_8": ("Distance to 8°C upper limit", "close proximity to 8°C excursion limit"),
    "dist_to_2": ("Distance to 2°C lower limit", "margin above 2°C freeze limit"),
    "door": ("Door status", "door currently open"),
    "cooling": ("Compressor state", "cooling compressor is currently OFF"),
    "slope_1m": ("1-minute slope", "rapid short-term temperature rise"),
    "slope_3m": ("3-minute slope", "temperature rising quickly over 3 minutes"),
    "slope_5m": ("5-minute slope", "sustained upward temperature trend over 5 minutes"),
    "slope_10m": ("10-minute slope", "gradual upward temperature drift over 10 minutes"),
    "accel": ("Thermal acceleration", "temperature rate of rise is accelerating"),
    "mean_5m": ("5-minute average", "5-minute mean temperature elevated"),
    "std_5m": ("5-minute fluctuation", "temperature fluctuations observed"),
    "max_15m": ("15-minute maximum", "recent peak temperature near limit"),
    "door_open_count_10m": ("Door openings", "frequent door openings in last 10 minutes"),
    "minutes_since_door_close": ("Time since door closed", "recent door opening activity"),
    "minutes_since_door_open": ("Time door open", "door held open for an extended period"),
    "cooling_on_frac_10m": ("Compressor duty cycle", "compressor under-active in past 10 minutes"),
    "minutes_since_cooling_off": ("Time compressor off", "compressor idle for a prolonged duration"),
    "ambient_minus_storage": ("Ambient-storage differential", "large ambient thermal gradient driving heat gain"),
}


def build_explanation(
    shap_values: Optional[np.ndarray],
    feature_dict: Dict[str, Any],
    risk_level: str,
    rule_reason: Optional[str] = None,
    ttx_min: Optional[float] = None,
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Builds a plain-language explanation and extracts top factors.
    """
    factors = []

    if shap_values is not None and len(shap_values) == len(FEATURE_NAMES):
        # Sort factors by positive contribution toward excursion risk
        sorted_indices = np.argsort(shap_values)[::-1]
        for idx in sorted_indices[:3]:
            feat_name = FEATURE_NAMES[idx]
            val = feature_dict.get(feat_name, np.nan)
            shap_val = float(shap_values[idx])
            label, desc = FEATURE_DESCRIPTIONS.get(feat_name, (feat_name, feat_name))
            factors.append({
                "feature": feat_name,
                "label": label,
                "description": desc,
                "value": round(float(val), 3) if not np.isnan(val) else None,
                "shap_impact": round(shap_val, 4),
            })

    # Compose explanation sentences
    sentences = []

    if rule_reason:
        sentences.append(rule_reason)
    elif risk_level == "High":
        if ttx_min is not None and ttx_min > 0:
            sentences.append(f"High risk of temperature excursion reaching 8°C in ~{int(round(ttx_min))} minutes.")
        else:
            sentences.append("High risk of temperature excursion projected within 30 minutes.")
    elif risk_level == "Medium":
        sentences.append("Elevated risk of temperature excursion detected; close monitoring advised.")
    else:
        sentences.append("Storage temperature is within safe nominal limits (2-8°C).")

    # Add factor context if rule reason did not already capture it
    if not rule_reason and factors:
        top_contrib = [f["description"] for f in factors if f["shap_impact"] > 0]
        if top_contrib:
            sentences.append(f"Key contributing factors: {', '.join(top_contrib[:2])}.")

    full_explanation = " ".join(sentences).strip()
    if not full_explanation:
        full_explanation = f"Current risk level is {risk_level}. Temperature reading nominal."

    return full_explanation, factors
