"""
Causal Feature Extraction for AeroCold.
Strictly causal: uses only stored readings with ts <= latest ts.
Computes time-based slopes, accelerations, and aggregations.
"""

from typing import Any, Dict, Union
import numpy as np
import pandas as pd
from backend.app.config import FEATURE_NAMES


def compute_slope(ts_sec: np.ndarray, temp: np.ndarray) -> float:
    """
    Computes slope in degrees Celsius per minute using linear regression or difference.
    Returns np.nan if fewer than 2 points or dt <= 0.
    """
    n = len(ts_sec)
    if n < 2:
        return np.nan
    dt_min = (ts_sec[-1] - ts_sec[0]) / 60.0
    if dt_min <= 0.05:  # Less than 3 seconds
        return np.nan
    if n == 2:
        return float((temp[-1] - temp[0]) / dt_min)
    # n > 2: OLS slope
    x = (ts_sec - ts_sec[0]) / 60.0
    x_mean = np.mean(x)
    y_mean = np.mean(temp)
    denom = np.sum((x - x_mean) ** 2)
    if denom < 1e-6:
        return float((temp[-1] - temp[0]) / dt_min)
    numer = np.sum((x - x_mean) * (temp - y_mean))
    return float(numer / denom)


def features_for_latest(history_df: Union[pd.DataFrame, Dict[str, Any]]) -> Dict[str, float]:
    """
    Takes all stored readings for a unit up to and including the current one.
    Columns required: ts, storage_c, ambient_c, door, cooling.
    Returns a dictionary of features for the LATEST reading matching FEATURE_NAMES.
    Never throws an exception on short or sparse histories.
    """
    if isinstance(history_df, dict):
        df = pd.DataFrame(history_df)
    else:
        df = history_df

    if df.empty or len(df) == 0:
        return {name: np.nan for name in FEATURE_NAMES}

    # Ensure sorted by ts
    df = df.sort_values("ts")
    ts_arr = df["ts"].to_numpy(dtype=np.float64)
    storage_arr = df["storage_c"].to_numpy(dtype=np.float64)
    ambient_arr = df["ambient_c"].to_numpy(dtype=np.float64)
    door_arr = df["door"].to_numpy(dtype=np.int32)
    cooling_arr = df["cooling"].to_numpy(dtype=np.int32)

    latest_ts = ts_arr[-1]
    latest_storage = float(storage_arr[-1])
    latest_ambient = float(ambient_arr[-1])
    latest_door = int(door_arr[-1])
    latest_cooling = int(cooling_arr[-1])

    # Causal 3-point median filter on storage_c to ignore isolated glitch spikes
    n = len(storage_arr)
    filtered_storage = np.copy(storage_arr)
    if n >= 3:
        for i in range(2, n):
            # Causal median over last 3 points
            filtered_storage[i] = np.median(storage_arr[i - 2 : i + 1])

    # Windows in seconds
    def get_window(window_sec: float):
        mask = ts_arr >= (latest_ts - window_sec)
        return ts_arr[mask], filtered_storage[mask]

    ts_1m, t_1m = get_window(60.0)
    ts_3m, t_3m = get_window(180.0)
    ts_5m, t_5m = get_window(300.0)
    ts_10m, t_10m = get_window(600.0)
    ts_15m, t_15m = get_window(900.0)

    # Slopes in C/min
    slope_1m = compute_slope(ts_1m, t_1m)
    slope_3m = compute_slope(ts_3m, t_3m)
    slope_5m = compute_slope(ts_5m, t_5m)
    slope_10m = compute_slope(ts_10m, t_10m)

    # Acceleration: difference between short-term (3m) and medium-term (10m) slope
    if not np.isnan(slope_3m) and not np.isnan(slope_10m):
        accel = float(slope_3m - slope_10m)
    elif not np.isnan(slope_1m) and not np.isnan(slope_5m):
        accel = float(slope_1m - slope_5m)
    else:
        accel = np.nan

    # 5-minute aggregations
    mean_5m = float(np.mean(t_5m)) if len(t_5m) > 0 else latest_storage
    std_5m = float(np.std(t_5m)) if len(t_5m) > 1 else 0.0

    # 15-minute max
    max_15m = float(np.max(t_15m)) if len(t_15m) > 0 else latest_storage

    # Door statistics in last 10m
    mask_10m = ts_arr >= (latest_ts - 600.0)
    door_10m = door_arr[mask_10m]
    door_open_count_10m = float(np.sum(door_10m == 1))

    # Minutes since door closed
    if latest_door == 1:
        minutes_since_door_close = 0.0
    else:
        door_open_indices = np.where(door_arr == 1)[0]
        if len(door_open_indices) > 0:
            last_door_open_ts = ts_arr[door_open_indices[-1]]
            minutes_since_door_close = float((latest_ts - last_door_open_ts) / 60.0)
        else:
            minutes_since_door_close = 120.0  # Max history default

    # Minutes since door opened
    if latest_door == 0:
        door_open_indices = np.where(door_arr == 1)[0]
        if len(door_open_indices) > 0:
            last_door_open_ts = ts_arr[door_open_indices[-1]]
            minutes_since_door_open = float((latest_ts - last_door_open_ts) / 60.0)
        else:
            minutes_since_door_open = 120.0
    else:
        # Find start of current door open period
        door_closed_indices = np.where(door_arr == 0)[0]
        if len(door_closed_indices) > 0:
            start_open_ts = ts_arr[door_closed_indices[-1] + 1] if door_closed_indices[-1] + 1 < len(ts_arr) else latest_ts
            minutes_since_door_open = float((latest_ts - start_open_ts) / 60.0)
        else:
            minutes_since_door_open = float((latest_ts - ts_arr[0]) / 60.0)

    # Cooling statistics in last 10m
    cooling_10m = cooling_arr[mask_10m]
    cooling_on_frac_10m = float(np.mean(cooling_10m == 1)) if len(cooling_10m) > 0 else float(latest_cooling)

    # Minutes since cooling turned off
    if latest_cooling == 1:
        minutes_since_cooling_off = 0.0
    else:
        cooling_on_indices = np.where(cooling_arr == 1)[0]
        if len(cooling_on_indices) > 0:
            last_cooling_on_ts = ts_arr[cooling_on_indices[-1]]
            minutes_since_cooling_off = float((latest_ts - last_cooling_on_ts) / 60.0)
        else:
            minutes_since_cooling_off = float((latest_ts - ts_arr[0]) / 60.0)

    features = {
        "storage_c": latest_storage,
        "ambient_c": latest_ambient,
        "dist_to_8": float(8.0 - latest_storage),
        "dist_to_2": float(latest_storage - 2.0),
        "door": latest_door,
        "cooling": latest_cooling,
        "slope_1m": slope_1m,
        "slope_3m": slope_3m,
        "slope_5m": slope_5m,
        "slope_10m": slope_10m,
        "accel": accel,
        "mean_5m": mean_5m,
        "std_5m": std_5m,
        "max_15m": max_15m,
        "door_open_count_10m": door_open_count_10m,
        "minutes_since_door_close": minutes_since_door_close,
        "minutes_since_door_open": minutes_since_door_open,
        "cooling_on_frac_10m": cooling_on_frac_10m,
        "minutes_since_cooling_off": minutes_since_cooling_off,
        "ambient_minus_storage": float(latest_ambient - latest_storage),
    }

    return features
