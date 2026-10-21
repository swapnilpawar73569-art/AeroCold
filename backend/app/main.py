"""
FastAPI Server for AeroCold Early-Warning Cold Chain Monitoring.
Exposes WebSocket and REST ingestion, live broadcast, and query endpoints.
"""

import json
import re
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Set
import pandas as pd
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.app.config import DATA_DIR, MODELS_DIR
from backend.app.db import (
    init_db,
    get_connection,
    get_latest_reading_for_unit,
    get_unit_history,
    get_all_units_summary,
)
from backend.app.scoring import score_reading, get_model_and_config

# Regex pattern for ingestion: handles newlines or spaces between AC|... tokens
INGEST_PATTERN = re.compile(
    r"AC\|([^|\s]+)\|(\d+)\|(-?\d+(?:\.\d+)?)\|(-?\d+(?:\.\d+)?)\|([01])\|([01])"
)

# Active WebSocket broadcast connections for live dashboard
active_live_sockets: Set[WebSocket] = set()


async def broadcast_reading(scored_data: Dict[str, Any]):
    """Broadcast newly scored reading to connected frontend clients."""
    if not active_live_sockets:
        return
    disconnected = set()
    message = json.dumps(scored_data)
    for ws in list(active_live_sockets):
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.add(ws)
    for ws in disconnected:
        active_live_sockets.discard(ws)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize SQLite and load ML models
    init_db()
    get_model_and_config()
    
    # Ensure all 5 units U1 to U5 are seeded
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(DISTINCT unit_id) FROM readings")
        count = cur.fetchone()[0]
        if count < 5:
            from backend.tools.stream_samples import ALL_UNITS_STREAM
            for line in ALL_UNITS_STREAM:
                process_raw_line_stream(line)
    finally:
        conn.close()

    print("=" * 60)
    print("  AeroCold Monitoring Server Active (Units U1..U5 Loaded)")
    print("  Ingest WebSocket: ws://localhost:8000/ws/ingest")
    print("  Live Stream WS:   ws://localhost:8000/ws/live")
    print("  REST API Docs:    http://localhost:8000/docs")
    print("=" * 60)
    yield


app = FastAPI(
    title="AeroCold Early-Warning Medical Cold-Storage System",
    description="Predictive temperature excursion warning for 2-8°C medical cold chain.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def process_raw_line_stream(raw_text: str) -> List[Dict[str, Any]]:
    """
    Parses AC|... lines separated by spaces or newlines.
    Scores each reading sequentially.
    """
    matches = list(INGEST_PATTERN.finditer(raw_text))
    results = []

    for m in matches:
        unit_id = m.group(1)
        ts = int(m.group(2))
        storage_c = float(m.group(3))
        ambient_c = float(m.group(4))
        door = int(m.group(5))
        cooling = int(m.group(6))

        scored = score_reading(
            unit_id=unit_id,
            ts=ts,
            storage_c=storage_c,
            ambient_c=ambient_c,
            door=door,
            cooling=cooling,
        )
        results.append(scored)

    return results


# 1. Ingest WebSocket
@app.websocket("/ws/ingest")
async def websocket_ingest(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            text = await websocket.receive_text()
            if not text.strip():
                continue
            scored_results = process_raw_line_stream(text)
            if not scored_results:
                await websocket.send_text(
                    json.dumps({"error": "Malformed line: expected AC|unit|ts|storage|ambient|door|cooling"})
                )
                continue

            for res in scored_results:
                # Reply to sender
                response_payload = {
                    "unit": res["unit"],
                    "ts": res["ts"],
                    "risk": res["risk"],
                    "prob": res["prob"],
                    "k3": res["k3"],
                    "ttx_min": res["ttx_min"],
                    "explanation": res["explanation"],
                }
                await websocket.send_text(json.dumps(response_payload))
                # Broadcast to dashboard
                await broadcast_reading(res)
    except WebSocketDisconnect:
        pass


# 2. Live Dashboard WebSocket
@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    await websocket.accept()
    active_live_sockets.add(websocket)
    try:
        while True:
            # Keep-alive receive ping
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_live_sockets.discard(websocket)


# 3. REST Ingest Fallback
class IngestRequest(BaseModel):
    data: str


@app.post("/api/ingest")
async def api_ingest(payload: IngestRequest):
    scored = process_raw_line_stream(payload.data)
    if not scored:
        raise HTTPException(
            status_code=400,
            detail="Malformed ingest string. Format: AC|unit|ts|storage|ambient|door|cooling",
        )
    for item in scored:
        await broadcast_reading(item)
    return {"status": "ok", "processed": len(scored), "readings": scored}


UNIT_METADATA = {
    "U1": {
        "payload": "Comirnaty mRNA Vaccine (Lot #VAX-8820)",
        "location": "Cold Vault Alpha • Geneva Distribution Hub",
        "battery_pct": 98,
        "setpoint_c": "3.5°C",
    },
    "U2": {
        "payload": "Insulin Glargine & Erythropoietin (Lot #MED-4091)",
        "location": "Aviation Cargo Container Pod 04 • In Transit (LX-18)",
        "battery_pct": 87,
        "setpoint_c": "4.0°C",
    },
    "U3": {
        "payload": "Pediatric Hepatitis B Biologics (Lot #PED-1102)",
        "location": "Autonomous Drone Carrier 02 • Final Mile",
        "battery_pct": 92,
        "setpoint_c": "3.8°C",
    },
    "U4": {
        "payload": "Meningococcal Conjugate Vaccines (Lot #MEN-3310)",
        "location": "Main Hospital Pharmacy Vault • Zurich Central",
        "battery_pct": 99,
        "setpoint_c": "4.0°C",
    },
    "U5": {
        "payload": "Cryo-Precipitated Blood Plasma (Lot #PLAS-9004)",
        "location": "Emergency Blood Bank Refrigerator Bay 03",
        "battery_pct": 94,
        "setpoint_c": "4.0°C",
    },
}

# 4. Units Fleet Overview
@app.get("/api/units")
def api_get_units():
    units = get_all_units_summary()
    enriched = []
    for u in units:
        u_dict = dict(u)
        meta = UNIT_METADATA.get(u_dict["unit_id"], {
            "payload": f"Medical Biologicals (Unit {u_dict['unit_id']})",
            "location": "Hospital Central Reserve Bay",
            "battery_pct": 95,
            "setpoint_c": "4.0°C",
        })
        u_dict.update(meta)
        enriched.append(u_dict)
    return {"units": enriched}


# 5. Unit Latest Reading
@app.get("/api/units/{unit_id}/latest")
def api_get_unit_latest(unit_id: str):
    latest = get_latest_reading_for_unit(unit_id)
    if not latest:
        raise HTTPException(status_code=404, detail=f"Unit {unit_id} not found")
    
    clean_latest = {}
    for k, v in latest.items():
        if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
            clean_latest[k] = None
        else:
            clean_latest[k] = v

    if clean_latest.get("top_factors") and isinstance(clean_latest["top_factors"], str):
        try:
            clean_latest["top_factors"] = json.loads(clean_latest["top_factors"])
        except Exception:
            clean_latest["top_factors"] = []
            
    meta = UNIT_METADATA.get(unit_id, {
        "payload": f"Medical Biologicals (Unit {unit_id})",
        "location": "Hospital Central Reserve Bay",
        "battery_pct": 95,
        "setpoint_c": "4.0°C",
    })
    clean_latest.update(meta)
    return clean_latest


# 6. Unit History
@app.get("/api/units/{unit_id}/history")
def api_get_unit_history(unit_id: str, minutes: int = Query(default=120, ge=1, le=1440)):
    latest = get_latest_reading_for_unit(unit_id)
    if not latest:
        return {"unit_id": unit_id, "readings": []}
        
    history_df = get_unit_history(unit_id, up_to_ts=latest["ts"], max_minutes=minutes)
    records = history_df.to_dict(orient="records")
    clean_records = []
    
    for r in records:
        clean_row = {}
        for k, v in r.items():
            if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
                clean_row[k] = None
            else:
                clean_row[k] = v
        if clean_row.get("top_factors") and isinstance(clean_row["top_factors"], str):
            try:
                clean_row["top_factors"] = json.loads(clean_row["top_factors"])
            except Exception:
                clean_row["top_factors"] = []
        clean_records.append(clean_row)
        
    return {"unit_id": unit_id, "readings": clean_records}


# 7. Evaluation Results
@app.get("/api/eval")
def api_get_evaluation():
    eval_file = MODELS_DIR / "eval_results.json"
    if not eval_file.exists():
        raise HTTPException(status_code=404, detail="Evaluation results not yet generated.")
    with open(eval_file, "r") as f:
        data = json.load(f)
    return data


# 8. Recovery vs Failure Scenarios
@app.get("/api/scenarios")
def api_get_scenarios():
    """
    Returns two scored example episodes from the dataset:
    - Door-Open Recovery (stays Low risk)
    - Compressor Failure (rises to High risk excursion)
    """
    train_file = DATA_DIR / "sim_train.csv"
    if not train_file.exists():
        raise HTTPException(status_code=404, detail="Simulator dataset not available.")

    df = pd.read_csv(train_file)
    door_ep = df[df["scenario"] == "door_open"]["episode_id"].iloc[0]
    fail_ep = df[df["scenario"] == "compressor_failure"]["episode_id"].iloc[0]

    door_df = df[df["episode_id"] == door_ep].copy().sort_values("ts")
    fail_df = df[df["episode_id"] == fail_ep].copy().sort_values("ts")

    def score_trace(sub_df: pd.DataFrame, max_rows: int = 60) -> List[Dict[str, Any]]:
        # Take first max_rows (e.g. 1 hour)
        rows = sub_df.iloc[:max_rows]
        out = []
        for i in range(len(rows)):
            row = rows.iloc[i]
            # Use temporary scoring calculation
            hist = rows.iloc[: i + 1]
            from backend.app.features import features_for_latest
            from backend.app.safety import apply_safety_rules
            model, _, config = get_model_and_config()
            feats = features_for_latest(hist)
            m_prob = 0.05
            if model is not None:
                try:
                    feat_v = pd.DataFrame([feats])
                    m_prob = float(model.predict_proba(feat_v)[0, 1])
                except Exception:
                    pass
            fin_prob, reason, ttx = apply_safety_rules(m_prob, hist, config.get("safety_rules"))
            r_level = "High" if fin_prob >= config["thresholds"]["medium"] else ("Medium" if fin_prob >= config["thresholds"]["low"] else "Low")
            out.append({
                "ts": int(row["ts"]),
                "rel_min": round((row["ts"] - rows.iloc[0]["ts"]) / 60.0, 1),
                "storage_c": float(row["storage_c"]),
                "true_c": float(row["true_c"]),
                "ambient_c": float(row["ambient_c"]),
                "door": int(row["door"]),
                "cooling": int(row["cooling"]),
                "prob": round(float(fin_prob), 4),
                "risk": r_level,
                "ttx_min": round(float(ttx), 1) if ttx is not None else None,
                "reason": reason or ("Safe nominal recovery" if r_level == "Low" else "Thermal excursion drift"),
            })
        return out

    return {
        "door_open_recovery": {
            "title": "Harmless Door-Open (Recovers to Low Risk)",
            "description": "Door opened for 2-3 minutes. Compressor kicks in, temperature quickly returns to safe 2-8°C band.",
            "data": score_trace(door_df, 60),
        },
        "compressor_failure": {
            "title": "Compressor Failure (Escalates to High Risk)",
            "description": "Cooling lost at random time. Temperature steadily drifts upward toward ambient, triggering early warning before crossing 8°C.",
            "data": score_trace(fail_df, 60),
        },
    }


# 9. Interactive Demo Control Endpoints
class ManualInjectRequest(BaseModel):
    unit_id: str
    storage_c: float
    ambient_c: float = 30.0
    door: int = 0
    cooling: int = 1
    ts: int = 0


@app.post("/api/demo/inject")
async def api_demo_inject(req: ManualInjectRequest):
    import time
    actual_ts = req.ts if req.ts > 0 else int(time.time())
    scored = score_reading(
        unit_id=req.unit_id,
        ts=actual_ts,
        storage_c=req.storage_c,
        ambient_c=req.ambient_c,
        door=req.door,
        cooling=req.cooling,
    )
    await broadcast_reading(scored)
    return scored


@app.post("/api/demo/stream-sample")
async def api_demo_stream_sample(scenario: str = Query(default="all")):
    """
    Triggers simulated telemetry stream directly from the web interface:
    - 'u1': Door open recovery sequence
    - 'u2': Compressor failure excursion sequence
    - 'u3': Power cut / heat wave exposure
    - 'u4': Optimal thermostat cycling
    - 'u5': Sensor glitch spike filtering
    - 'all' or 'both': Streams all units U1 to U5
    """
    import asyncio
    from backend.tools.stream_samples import (
        SAMPLE_U1_DOOR_OPEN,
        SAMPLE_U2_COOLING_FAILURE,
        SAMPLE_U3_POWER_CUT,
        SAMPLE_U4_NOMINAL_CYCLE,
        SAMPLE_U5_SENSOR_GLITCH,
        ALL_UNITS_STREAM,
    )

    if scenario == "u1":
        lines = SAMPLE_U1_DOOR_OPEN
    elif scenario == "u2":
        lines = SAMPLE_U2_COOLING_FAILURE
    elif scenario == "u3":
        lines = SAMPLE_U3_POWER_CUT
    elif scenario == "u4":
        lines = SAMPLE_U4_NOMINAL_CYCLE
    elif scenario == "u5":
        lines = SAMPLE_U5_SENSOR_GLITCH
    else:
        lines = ALL_UNITS_STREAM

    scored_list = []
    for line in lines:
        results = process_raw_line_stream(line)
        for r in results:
            scored_list.append(r)
            await broadcast_reading(r)
        await asyncio.sleep(0.25)

    return {"status": "success", "streamed": len(scored_list), "readings": scored_list}


@app.post("/api/demo/reset-db")
async def api_demo_reset_db():
    """
    Resets the SQLite database and reseeds all units U1 through U5.
    Allows continuous clean demo resets during presentations.
    """
    from backend.app.config import DB_PATH
    from backend.app.db import _DB_LOCK

    with _DB_LOCK:
        conn = get_connection()
        try:
            with conn:
                conn.execute("DELETE FROM readings;")
        finally:
            conn.close()

    # Re-seed baseline demo readings across all 5 units
    from backend.tools.stream_samples import ALL_UNITS_STREAM
    for line in ALL_UNITS_STREAM:
        process_raw_line_stream(line)

    return {"status": "database_reset_and_reseeded", "units": ["U1", "U2", "U3", "U4", "U5"]}


@app.post("/api/demo/tick-live")
async def api_demo_tick_live(unit_id: str = Query(default="U1")):
    """
    Simulates a live streaming tick for the specified unit.
    Advances timestamp by 30 seconds and computes physics:
    - If door open: temp rises by ~0.12°C
    - If cooling ON: temp cools by ~0.05°C towards setpoint (3.8°C)
    - If cooling OFF: temp warms by ~0.08°C towards ambient
    Scores and broadcasts over WebSocket for instant live UI animation.
    """
    latest = get_latest_reading_for_unit(unit_id)
    if latest:
        next_ts = latest["ts"] + 30
        curr_temp = latest["storage_c"]
        ambient = latest["ambient_c"]
        door = latest["door"]
        cooling = latest["cooling"]
    else:
        import time
        next_ts = int(time.time())
        curr_temp = 4.2
        ambient = 30.0
        door = 0
        cooling = 1

    # Physics simulation for continuous live tick
    if door == 1:
        new_temp = round(curr_temp + 0.12, 2)
    elif cooling == 1:
        if curr_temp > 3.8:
            new_temp = round(curr_temp - 0.05, 2)
        else:
            new_temp = round(curr_temp + 0.02, 2)
    else:
        new_temp = round(curr_temp + 0.08, 2)

    scored = score_reading(
        unit_id=unit_id,
        ts=next_ts,
        storage_c=new_temp,
        ambient_c=ambient,
        door=door,
        cooling=cooling,
    )
    await broadcast_reading(scored)
    return scored


@app.post("/api/demo/event")
async def api_demo_event(unit_id: str = Query(...), event_type: str = Query(...)):
    """
    Injects operational cold-chain events:
    - 'door_open': Door opened, temperature jumps +0.6°C
    - 'door_close': Door closed, compressor engages
    - 'cooling_cut': Compressor power failure (cooling=0)
    - 'cooling_restore': Compressor power restored (cooling=1)
    - 'sensor_spike': Transient sensor electrical spike (+3.5°C)
    """
    latest = get_latest_reading_for_unit(unit_id)
    next_ts = (latest["ts"] if latest else 1760000000) + 30
    curr_temp = latest["storage_c"] if latest else 4.0
    ambient = latest["ambient_c"] if latest else 30.0
    door = latest["door"] if latest else 0
    cooling = latest["cooling"] if latest else 1

    if event_type == "door_open":
        door = 1
        curr_temp = round(curr_temp + 0.6, 2)
    elif event_type == "door_close":
        door = 0
    elif event_type == "cooling_cut":
        cooling = 0
    elif event_type == "cooling_restore":
        cooling = 1
    elif event_type == "sensor_spike":
        curr_temp = round(curr_temp + 3.5, 2)

    scored = score_reading(
        unit_id=unit_id,
        ts=next_ts,
        storage_c=curr_temp,
        ambient_c=ambient,
        door=door,
        cooling=cooling,
    )
    await broadcast_reading(scored)
    return scored

