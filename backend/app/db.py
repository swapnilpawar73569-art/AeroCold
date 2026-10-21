"""
SQLite Database module for AeroCold.
Configured with WAL mode, busy timeout, and thread-safe connection handling.
"""

import os
import sqlite3
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional
import pandas as pd
from backend.app.config import DB_PATH

_DB_LOCK = threading.Lock()


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn


def init_db():
    """
    Initializes SQLite table and indices per specification.
    """
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    with _DB_LOCK:
        conn = get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS readings (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      unit_id TEXT NOT NULL,
                      ts INTEGER NOT NULL,
                      storage_c REAL NOT NULL,
                      ambient_c REAL NOT NULL,
                      door INTEGER NOT NULL CHECK (door IN (0,1)),
                      cooling INTEGER NOT NULL CHECK (cooling IN (0,1)),
                      prob REAL, model_prob REAL, risk_level TEXT,
                      time_to_excursion_min REAL, k3_flag INTEGER,
                      explanation TEXT, top_factors TEXT,
                      received_at TEXT DEFAULT (datetime('now')),
                      UNIQUE (unit_id, ts)
                    );
                    """
                )
                conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_readings_unit_ts ON readings (unit_id, ts);
                    """
                )
        finally:
            conn.close()


def get_unit_history(unit_id: str, up_to_ts: int, max_minutes: int = 120) -> pd.DataFrame:
    """
    Loads history for unit_id strictly with ts <= up_to_ts,
    limited to the last max_minutes (max_minutes * 60 seconds).
    Never uses wall-clock time.
    """
    min_ts = up_to_ts - (max_minutes * 60)
    conn = get_connection()
    try:
        query = """
            SELECT id, unit_id, ts, storage_c, ambient_c, door, cooling,
                   prob, model_prob, risk_level, time_to_excursion_min, k3_flag,
                   explanation, top_factors
            FROM readings
            WHERE unit_id = ? AND ts <= ? AND ts >= ?
            ORDER BY ts ASC
        """
        df = pd.read_sql_query(query, conn, params=(unit_id, up_to_ts, min_ts))
        return df
    finally:
        conn.close()


def get_previous_two_readings(unit_id: str, current_ts: int) -> List[Dict[str, Any]]:
    """
    Returns the two most recent stored readings strictly prior to current_ts.
    Used to compute the persistent K=3 condition directly from SQLite.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT risk_level, prob
            FROM readings
            WHERE unit_id = ? AND ts < ?
            ORDER BY ts DESC
            LIMIT 2
            """,
            (unit_id, current_ts),
        )
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_latest_reading_for_unit(unit_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT * FROM readings
            WHERE unit_id = ?
            ORDER BY ts DESC
            LIMIT 1
            """,
            (unit_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_all_units_summary() -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT r.*
            FROM readings r
            INNER JOIN (
                SELECT unit_id, MAX(ts) as max_ts
                FROM readings
                GROUP BY unit_id
            ) latest ON r.unit_id = latest.unit_id AND r.ts = latest.max_ts
            ORDER BY r.unit_id ASC
            """
        )
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
