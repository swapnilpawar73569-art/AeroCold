# AeroCold: Predictive Early-Warning Medical Cold Chain System (2–8°C)

> **Hackathon Round 2 Build Specification Implementation**  
> GitHub Repository: [https://github.com/swapnilpawar73569-art/AeroCold](https://github.com/swapnilpawar73569-art/AeroCold)

AeroCold is an intelligent early-warning platform for medical cold-storage refrigeration units (vaccines, biologics, blood products). It forecasts the probability of temperature excursions (> 8.0°C) **within the next 30 minutes**, distinguishing routine, harmless door openings from catastrophic cooling failures, with plain-language diagnostic explanations powered by TreeSHAP and transparent physics rules.

---

## 🏆 Round 2 Jury Test Verification

| Test Scenario | Input Sequence | Final Risk Level | Key Explanatory Output | Excursion Prevention |
| :--- | :--- | :--- | :--- | :--- |
| **U1: Harmless Door Open** | 3 readings (6.4°C → 7.1°C → 6.2°C) | **Low** (`p = 0.0134`) | *"Door was opened and is now closed; temperature is falling back to normal."* | Excursion averted; no false alarm fatigue. |
| **U2: Cooling Failure** | 3 readings (5.0°C → 6.2°C → 7.1°C) | **High** (`p = 0.7500`, K=3 alert) | *"Cooling is off and temperature is rising; at this rate it reaches 8 C in about 5 minutes."* | Warns **~12 minutes before** crossing 8.0°C while chamber is still at 7.1°C. |

---

## 🔬 Core Architecture & Innovation

1. **Strictly Causal Feature Extraction (`backend/app/features.py`)**:
   - One unified function `features_for_latest(history)` used in both training and live scoring.
   - Time-based windows (1m, 3m, 5m, 10m, 15m) using unix timestamp seconds—handling heterogeneous sampling cadences (60s or 300s).
   - Causal 3-point median filter suppresses transient single-reading sensor spikes without introducing latency.

2. **Calibrated Machine Learning (`backend/train/train_model.py`)**:
   - LightGBM binary classifier trained on 400 simulated episodes (~114k readings).
   - Sigmoid probability calibration on validation split.
   - Validation ROC-AUC: **0.9565** (Medium threshold: `0.20`, High threshold: `0.527`).

3. **Transparent Safety Rule Layer (`backend/app/safety.py`)**:
   - `recovering` (door closed, cooling active, slope $\le$ 0): caps probability at 0.10 (Low).
   - `door_open` (door open, cooling active): caps probability at 0.45 (Medium).
   - `cooling_off_rising` (cooling off, slope > 0, TTX $\le$ 30m): floors probability at 0.75 (High).
   - Preserves `model_prob` alongside final `prob` for complete algorithmic auditing.

4. **Zero In-Memory State & SQLite WAL (`backend/app/db.py`)**:
   - Real-time persistence into `aerocold.db` in Write-Ahead Logging (WAL) mode.
   - K=3 persistence rule queries previously stored rows directly from SQLite.
   - Instant recovery across server reboots.

5. **Operator Transparency & TreeSHAP (`backend/app/explain.py`)**:
   - Translates top SHAP values into domain language (e.g., *"temperature rising quickly"*, *"cooling is off"*).

6. **Full-Featured Operator Cockpit (React + Vite + TypeScript + Recharts)**:
   - **Live Monitor**: Live unit selector, 2–8°C safe zone temperature chart, animated risk gauge, TTX countdown, and SHAP factors.
   - **Fleet Overview**: Multi-unit telemetry grid with live risk indicators.
   - **Recovery vs Failure**: Side-by-side comparative trajectories.
   - **Evaluation vs Baselines**: Bootstrap 95% confidence interval matrix against Fixed Threshold and Linear Extrapolation baselines.

---

## 📊 Benchmark Evaluation (Held-Out Test Split)

Metrics computed reading-by-reading on 80 held-out test episodes:

| Metric | Baseline 1 (Fixed >8.0°C) | Baseline 2 (Linear 5m) | **AeroCold (Ours)** |
| :--- | :--- | :--- | :--- |
| **Event Recall** | 100% [100%, 100%] | 100% [100%, 100%] | **95.4%** [90.1%, 100%] |
| **Event Precision** | 71.4% [60.8%, 83.6%] | 10.8% [8.1%, 14.7%] | **14.2%** [9.6%, 21.8%] |
| **False Alarms / Day** | 0.97 [0.46, 1.49] | 20.03 [15.16, 25.18] | **14.08** [8.73, 19.50] |
| **Mean Lead Time** | **0.0 min** *(alarms only after failure)* | 12.6 min | **12.2 min** *(early warning window)* |

> **Transparency Note**: All data is synthetically produced by our thermodynamic physics simulator (`backend/sim/simulator.py`). All benchmark metrics and bootstrap confidence intervals are computed directly by `backend/train/evaluate.py`.

---

## 🚀 Quickstart Guide

### 1. Requirements
- Python 3.10+
- Node.js 18+ & npm
- OpenMP runtime (`brew install libomp` on macOS)

### 2. Backend Setup & Run

```bash
# In repository root:
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt

# Start FastAPI server on port 8000
PYTHONPATH=. uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```
- Ingest WebSocket: `ws://localhost:8000/ws/ingest`
- Live Stream WebSocket: `ws://localhost:8000/ws/live`
- REST API Documentation: `http://localhost:8000/docs`

### 3. Frontend Setup & Run

```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173/` in your browser.

---

## 🧪 Testing & Sample Streaming

### Running the Pytest Suite
Verifies all 9 conditions required by the hackathon specification:
```bash
PYTHONPATH=. backend/venv/bin/pytest backend/tests/test_aerocold.py -v
```

### Streaming the Round 2 Jury Samples

Stream both U1 (Door-Open Recovery) and U2 (Cooling Failure) over WebSocket:
```bash
backend/venv/bin/python backend/tools/stream_samples.py --mode both
```

Or stream individual sequences:
```bash
# Door-Open sequence (U1)
backend/venv/bin/python backend/tools/stream_samples.py --mode u1

# Cooling-Failure sequence (U2)
backend/venv/bin/python backend/tools/stream_samples.py --mode u2
```

---

## 🛠️ Repository File Structure

```
AERO_COLD/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, WebSockets & REST routes
│   │   ├── db.py              # SQLite access with WAL mode & causal queries
│   │   ├── features.py        # Single causal features_for_latest() function
│   │   ├── scoring.py         # score_reading() orchestrator & K=3 persistence
│   │   ├── safety.py          # Transparent physical rule safety overrides
│   │   ├── explain.py         # TreeSHAP & plain-English diagnostic generator
│   │   └── config.py          # Column lists, thresholds, & paths
│   ├── sim/
│   │   ├── simulator.py       # Thermodynamic cold-storage simulator
│   │   └── plot_samples.py    # Verification plotting script
│   ├── train/
│   │   ├── build_dataset.py   # Multi-cadence dataset builder
│   │   ├── train_model.py     # LightGBM training & probability calibration
│   │   └── evaluate.py        # Event-level baseline evaluation with bootstrap CIs
│   ├── models/                # Saved models, SHAP explainer, config.json, eval_results.json
│   ├── data/                  # Generated CSV datasets & aerocold.db SQLite store
│   ├── tools/
│   │   └── stream_samples.py  # WebSocket/HTTP stream testing tool
│   └── tests/
│       └── test_aerocold.py   # 9-point pytest test suite
├── frontend/
│   ├── src/
│   │   ├── components/        # LiveMonitor, FleetOverview, ScenariosView, EvaluationView, Navbar
│   │   ├── App.tsx            # Main dashboard controller
│   │   ├── index.css          # Modern dark-mode medical glassmorphism styling
│   │   └── types.ts           # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
├── ASSUMPTIONS.md             # Documented architectural assumptions
├── PROMPTS_LOG.md             # Step-by-step build journal
└── README.md
```
