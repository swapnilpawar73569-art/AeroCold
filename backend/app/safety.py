"""
Transparent Safety Rule Layer for AeroCold.
Applies domain physics overrides for critical edge cases (sparse jury readings,
door-open recovery vs genuine cooling failure) before reaching 8.0 C.
Keeps model_prob intact for complete algorithmic transparency.
"""

from typing import Dict, Optional, Tuple, Union
import numpy as np
import pandas as pd


def compute_safety_slope(history_df: pd.DataFrame) -> Tuple[float, Optional[float]]:
    """
    Computes recent slope in C/min over last 1 to 5 minutes of data.
    If data is sparse (e.g. 300s readings), uses the last two readings.
    Also returns ttx (time-to-excursion in minutes) if slope > 0.
    """
    if len(history_df) < 2:
        return 0.0, None

    ts = history_df["ts"].to_numpy()
    storage = history_df["storage_c"].to_numpy()
    latest_ts = ts[-1]
    latest_temp = float(storage[-1])

    # Window 1 to 5 min (60 to 300s)
    mask = ts >= (latest_ts - 300)
    if np.sum(mask) >= 2:
        w_ts = ts[mask]
        w_t = storage[mask]
        dt_min = (w_ts[-1] - w_ts[0]) / 60.0
        if dt_min > 0.05:
            slope = float((w_t[-1] - w_t[0]) / dt_min)
        else:
            slope = 0.0
    else:
        # Fallback to last two readings
        dt_min = (ts[-1] - ts[-2]) / 60.0
        if dt_min > 0.05:
            slope = float((storage[-1] - storage[-2]) / dt_min)
        else:
            slope = 0.0

    ttx = None
    if slope > 0.001 and latest_temp < 8.0:
        ttx = float((8.0 - latest_temp) / slope)

    return slope, ttx


def apply_safety_rules(
    model_prob: float,
    history_df: pd.DataFrame,
    config: Optional[Dict[str, float]] = None,
) -> Tuple[float, Optional[str], Optional[float]]:
    """
    Applies transparent physical rules on top of the model probability.
    Returns: (final_prob, rule_reason, ttx_min)
    """
    if config is None:
        from backend.app.config import (
            SAFETY_RECOVERING_CAP,
            SAFETY_DOOR_OPEN_CAP,
            SAFETY_COOLING_OFF_TTX30_FLOOR,
            SAFETY_COOLING_OFF_TTX60_FLOOR,
        )
        rec_cap = SAFETY_RECOVERING_CAP
        door_cap = SAFETY_DOOR_OPEN_CAP
        c_off_30 = SAFETY_COOLING_OFF_TTX30_FLOOR
        c_off_60 = SAFETY_COOLING_OFF_TTX60_FLOOR
    else:
        rec_cap = config.get("recovering_cap", 0.10)
        door_cap = config.get("door_open_cap", 0.45)
        c_off_30 = config.get("cooling_off_ttx30_floor", 0.75)
        c_off_60 = config.get("cooling_off_ttx60_floor", 0.45)

    if history_df.empty:
        return model_prob, None, None

    latest_row = history_df.iloc[-1]
    door_now = int(latest_row["door"])
    cooling_now = int(latest_row["cooling"])
    storage_now = float(latest_row["storage_c"])

    slope, ttx = compute_safety_slope(history_df)

    recovering = (door_now == 0) and (cooling_now == 1) and (slope <= 0.01)
    cooling_off_rising = (cooling_now == 0) and (slope > 0.005)

    final_prob = model_prob
    reason = None

    # Rule 1: Recovering after door opening
    if recovering:
        if final_prob > rec_cap:
            final_prob = rec_cap
        reason = "Door was opened and is now closed; temperature is falling back to normal."

    # Rule 2: Door currently open with active compressor
    elif door_now == 1 and cooling_now == 1:
        if final_prob > door_cap:
            final_prob = door_cap
        reason = "Door is open; this looks like a temporary spike."

    # Rule 3: Cooling failure with rapid excursion (< 30 min)
    elif cooling_off_rising and (ttx is not None) and (ttx <= 30.0):
        if final_prob < c_off_30:
            final_prob = c_off_30
        reason = f"Cooling is off and temperature is rising; at this rate it reaches 8 C in about {int(round(ttx))} minutes."

    # Rule 4: Cooling failure with moderate excursion (< 60 min)
    elif cooling_off_rising and (ttx is not None) and (ttx <= 60.0):
        if final_prob < c_off_60:
            final_prob = c_off_60
        reason = f"Cooling is off and temperature is rising; at this rate it reaches 8 C in about {int(round(ttx))} minutes."

    return float(np.clip(final_prob, 0.0, 1.0)), reason, ttx
