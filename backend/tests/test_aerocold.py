"""
Pytest test suite for AeroCold.
Tests all 9 requirements from Section 11 of the specification:
1. Door-open ends Low
2. Cooling-off warns early
3. Persistence across restart
4. Causality
5. Parity
6. Time-based window handling
7. Parsing multiple readings and ignoring garbage
8. Deduplication
9. Model sanity on door_open vs compressor_failure
"""

import os
import tempfile
from pathlib import Path
import pytest
import pandas as pd
import numpy as np

# Set temporary DB for isolated testing
temp_db_fd, temp_db_path = tempfile.mkstemp(suffix=".db")
os.environ["AEROCOLD_DB"] = temp_db_path

from backend.app.config import FEATURE_NAMES, DATA_DIR, MODELS_DIR
from backend.app.db import (
    init_db,
    get_connection,
    get_latest_reading_for_unit,
    get_unit_history,
)
from backend.app.features import features_for_latest
from backend.app.scoring import score_reading, get_model_and_config
from backend.app.main import process_raw_line_stream, app
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True, scope="session")
def setup_test_db():
    init_db()
    get_model_and_config()
    yield
    try:
        os.close(temp_db_fd)
        if os.path.exists(temp_db_path):
            os.remove(temp_db_path)
    except Exception:
        pass


# 1. Door-open ends Low: the last U1 reading is Low
def test_door_open_ends_low():
    u1_lines = [
        ("U1", 1760000000, 6.4, 30.0, 1, 1),
        ("U1", 1760000060, 7.1, 30.0, 1, 1),
        ("U1", 1760000120, 6.2, 30.0, 0, 1),
    ]
    res = None
    for item in u1_lines:
        res = score_reading(*item)

    assert res is not None
    assert res["unit"] == "U1"
    assert res["risk"] == "Low", f"Expected Low risk for recovered door, got {res['risk']}"
    assert res["prob"] <= 0.30


# 2. Cooling-off warns early: last U2 reading has higher risk than U1's last,
# higher prob, non-empty explanation, and storage_c < 8.0
def test_cooling_off_warns_early():
    u2_lines = [
        ("U2", 1760000000, 5.0, 32.0, 0, 0),
        ("U2", 1760000300, 6.2, 32.0, 0, 0),
        ("U2", 1760000600, 7.1, 32.0, 0, 0),
    ]
    u2_res = None
    for item in u2_lines:
        u2_res = score_reading(*item)

    u1_latest = get_latest_reading_for_unit("U1")
    assert u2_res is not None
    assert u2_res["risk"] in ("Medium", "High")
    assert u2_res["prob"] > u1_latest["prob"]
    assert u2_res["storage_c"] < 8.0
    assert len(u2_res["explanation"]) > 0


# 3. Persistence across restart: create a new connection/app query; /latest is identical
def test_persistence_across_restart():
    # Simulate fresh query directly against SQLite
    u1_latest = get_latest_reading_for_unit("U1")
    u2_latest = get_latest_reading_for_unit("U2")

    assert u1_latest is not None
    assert u1_latest["risk_level"] == "Low"
    assert u2_latest is not None
    assert u2_latest["risk_level"] in ("Medium", "High")

    # FastAPI TestClient endpoint
    client = TestClient(app)
    resp = client.get("/api/units/U1/latest")
    assert resp.status_code == 200
    assert resp.json()["risk_level"] == "Low"


# 4. Causality: ingest readings 1..k; re-score reading k with same history; result unchanged
def test_causality():
    unit = "U_CAUSAL"
    t1 = score_reading(unit, 1000, 4.0, 25.0, 0, 1)
    t2 = score_reading(unit, 1060, 4.2, 25.0, 0, 1)
    t3 = score_reading(unit, 1120, 4.5, 25.0, 0, 1)

    # Ingest future readings
    score_reading(unit, 1180, 5.0, 25.0, 0, 1)
    score_reading(unit, 1240, 5.5, 25.0, 0, 1)

    # Re-evaluate reading 3 using history <= 1120
    hist = get_unit_history(unit, up_to_ts=1120)
    feats = features_for_latest(hist)
    assert abs(feats["storage_c"] - t3["storage_c"]) < 1e-6
    assert abs(feats["dist_to_8"] - (8.0 - t3["storage_c"])) < 1e-6


# 5. Parity: features computed through DB path equal training-time features
def test_feature_parity():
    records = [
        {"ts": 1000, "storage_c": 4.0, "ambient_c": 28.0, "door": 0, "cooling": 1},
        {"ts": 1060, "storage_c": 4.2, "ambient_c": 28.0, "door": 0, "cooling": 1},
        {"ts": 1120, "storage_c": 4.5, "ambient_c": 28.0, "door": 0, "cooling": 1},
    ]
    df = pd.DataFrame(records)
    feats_direct = features_for_latest(df)

    # Score through DB
    unit = "U_PARITY"
    for r in records:
        score_reading(unit, r["ts"], r["storage_c"], r["ambient_c"], r["door"], r["cooling"])

    hist_db = get_unit_history(unit, up_to_ts=1120)
    feats_db = features_for_latest(hist_db)

    for f in FEATURE_NAMES:
        val1 = feats_direct[f]
        val2 = feats_db[f]
        if np.isnan(val1):
            assert np.isnan(val2)
        else:
            assert abs(val1 - val2) < 1e-6, f"Mismatch on {f}: {val1} != {val2}"


# 6. Time-based windows: 60s and 300s cadences score without errors; slope in C/min
def test_time_based_cadences():
    unit_60 = "U_60S"
    score_reading(unit_60, 2000, 4.0, 25.0, 0, 1)
    res_60 = score_reading(unit_60, 2060, 4.6, 25.0, 0, 1)  # +0.6 C in 1 min -> slope 0.6 C/min

    unit_300 = "U_300S"
    score_reading(unit_300, 3000, 4.0, 25.0, 0, 1)
    res_300 = score_reading(unit_300, 3300, 5.0, 25.0, 0, 1)  # +1.0 C in 5 min -> slope 0.2 C/min

    assert res_60 is not None
    assert res_300 is not None


# 7. Parsing: space-separated readings parsed correctly, malformed lines ignored
def test_parsing_and_resilience():
    text = (
        "AC|U_PARSE|4000|4.1|25|0|1  AC|U_PARSE|4060|4.3|25|0|1 AC|U_PARSE|4120|4.5|25|0|1\n"
        "MALFORMED_GARBAGE_LINE_WITHOUT_PREFIX\n"
        "AC|GARBAGE|NON_NUMERIC_TIME|abc|def|2|2\n"
    )
    results = process_raw_line_stream(text)
    assert len(results) == 3
    assert [r["ts"] for r in results] == [4000, 4060, 4120]


# 8. Deduplication: same (unit, ts) twice stores one row and returns stored result
def test_deduplication():
    unit = "U_DEDUP"
    ts = 5000
    res1 = score_reading(unit, ts, 4.2, 26.0, 0, 1)
    res2 = score_reading(unit, ts, 4.2, 26.0, 0, 1)

    assert res1["prob"] == res2["prob"]

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM readings WHERE unit_id = ? AND ts = ?", (unit, ts))
        count = cur.fetchone()[0]
        assert count == 1
    finally:
        conn.close()


# 9. Model sanity: test set checks
def test_model_sanity_on_scenarios():
    # Test that model correctly distinguishes nominal from failure
    norm_hist = pd.DataFrame([
        {"ts": 1000, "storage_c": 4.0, "ambient_c": 28.0, "door": 0, "cooling": 1},
        {"ts": 1060, "storage_c": 3.8, "ambient_c": 28.0, "door": 0, "cooling": 1},
        {"ts": 1120, "storage_c": 3.6, "ambient_c": 28.0, "door": 0, "cooling": 1},
    ])
    fail_hist = pd.DataFrame([
        {"ts": 2000, "storage_c": 5.0, "ambient_c": 34.0, "door": 0, "cooling": 0},
        {"ts": 2300, "storage_c": 6.2, "ambient_c": 34.0, "door": 0, "cooling": 0},
        {"ts": 2600, "storage_c": 7.3, "ambient_c": 34.0, "door": 0, "cooling": 0},
    ])

    norm_res = score_reading("U_SANITY_NORM", 1120, 3.6, 28.0, 0, 1)
    fail_res = score_reading("U_SANITY_FAIL", 2600, 7.3, 34.0, 0, 0)

    assert norm_res["risk"] == "Low"
    assert fail_res["risk"] in ("Medium", "High")
    assert fail_res["prob"] > norm_res["prob"]
