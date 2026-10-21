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
    print("=" * 60)
    print("  AeroCold Monitoring Server Active")
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


# 4. Units Fleet Overview
@app.get("/api/units")
def api_get_units():
    units = get_all_units_summary()
    return {"units": units}


# 5. Unit Latest Reading
@app.get("/api/units/{unit_id}/latest")
def api_get_unit_latest(unit_id: str):
    latest = get_latest_reading_for_unit(unit_id)
    if not latest:
        raise HTTPException(status_code=404, detail=f"Unit {unit_id} not found")
    if latest.get("top_factors") and isinstance(latest["top_factors"], str):
        try:
            latest["top_factors"] = json.loads(latest["top_factors"])
        except Exception:
            latest["top_factors"] = []
    return latest


# 6. Unit History
@app.get("/api/units/{unit_id}/history")
def api_get_unit_history(unit_id: str, minutes: int = Query(default=120, ge=1, le=1440)):
    latest = get_latest_reading_for_unit(unit_id)
    if not latest:
        return {"unit_id": unit_id, "readings": []}
    history_df = get_unit_history(unit_id, up_to_ts=latest["ts"], max_minutes=minutes)
    records = history_df.to_dict(orient="records")
    for r in records:
        if r.get("top_factors") and isinstance(r["top_factors"], str):
            try:
                r["top_factors"] = json.loads(r["top_factors"])
            except Exception:
                r["top_factors"] = []
    return {"unit_id": unit_id, "readings": records}


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
