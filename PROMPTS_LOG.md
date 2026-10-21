# AeroCold — Prompt Engineering & System Architecture Log

This document records the prompt engineering sequence and iterative architectural decisions used to develop **AeroCold**, submitted for Hackathon evaluation.

---

## 🧭 Prompt Progression & AI Collaboration Log

### 1. Thermodynamic Physical Modeling & Scenario Simulation
- **Prompt**:
  > *"We are building AeroCold for medical cold chain intelligence (2–8°C). Architect a first-principles thermodynamic physics simulator implementing Newton's law of cooling, thermostat hysteresis (cycling ON at 5.0°C, OFF at 3.0°C), diurnal ambient variations (24–36°C with heatwaves up to 40°C), and physical disturbance events (door openings, compressor failures, power cuts). Generate 400 clean train/validation/test episodes with ground-truth noise-free labels, ensuring strict temporal causality without future data leakage."*
- **Outcome**:
  - Implemented `backend/sim/simulator.py`.
  - Generated 400 episodes (114,866 train, 38,965 validation, 38,538 test points).
  - Validated physical trajectories in `sample_episodes.png`.

---

### 2. Strictly Causal Feature Engineering & Sparse Data Augmentation
- **Prompt**:
  > *"Design a single, strictly causal feature engineering function `features_for_latest` that operates identically in training and live scoring. Calculate multi-scale window features (1m, 3m, 5m, 10m, 15m) based strictly on unix timestamps in seconds, never row counts. Include 3-point median filtering for sensor spike rejection, acceleration, and compressor duty cycles. Augment the training dataset with 60s, 120s, and 300s cadences so the pipeline remains resilient when sparse jury readings arrive."*
- **Outcome**:
  - Implemented `backend/app/features.py` with 20 causal features.
  - Augmented training dataset across variable cadences (67,309 train vectors).

---

### 3. LightGBM Classifier, Platt Scaling & TreeSHAP Explainability
- **Prompt**:
  > *"Train a LightGBM gradient-boosted classifier optimized for early temperature excursion detection. Apply probability calibration using `CalibratedClassifierCV` with Sigmoid/Platt scaling on the validation split so output probabilities represent true empirical risk. Calibrate decision thresholds on the validation set for Medium Risk (0.200) and High Risk (0.527). Export a TreeSHAP explainer to calculate local feature impact attributions for real-time operator interpretability."*
- **Outcome**:
  - Achieved **ROC-AUC = 0.9565** on validation set.
  - Exported calibrated model (`calibrated_model.joblib`), SHAP explainer (`shap_explainer.joblib`), and configuration thresholds (`config.json`).

---

### 4. Transparent Safety Guardrail Layer & Physics Overrides
- **Prompt**:
  > *"In healthcare cold-chain monitoring, pure black-box ML models can produce blind spots on short histories. Build a transparent thermodynamic safety layer that acts as an explainable guardrail: cap risk if the door was closed and cooling is actively recovering (to eliminate false alarms), and enforce high risk with Time-to-Excursion (TTX) calculation if cooling is lost and temperature is rising rapidly. Keep both `model_prob` and overridden `prob` in the database for complete clinical auditability."*
- **Outcome**:
  - Implemented `backend/app/safety.py` with physical overrides (`recovering`, `door_open`, `cooling_off_rising`).
  - Added deterministic TTX projection based on empirical thermal slope.

---

### 5. Zero In-Memory State Leakage & SQLite WAL Persistence
- **Prompt**:
  > *"Implement K=3 consecutive-reading persistence to prevent nuisance alarm spikes. Ensure zero in-memory state leakage: evaluate K=3 strictly from SQLite WAL queries of the previous two stored readings for that unit. If the server crashes, reboots, or IoT drops, the K=3 state must remain 100% persistent."*
- **Outcome**:
  - Implemented `backend/app/db.py` with SQLite WAL mode, concurrency locking, and backward-looking K=3 evaluation.

---

### 6. Rigorous Benchmarking & 500-Iteration Bootstrap Confidence Intervals
- **Prompt**:
  > *"Perform an event-level benchmark of AeroCold against Baseline 1 (Fixed threshold >8.0°C) and Baseline 2 (5-minute linear extrapolation) across 80 held-out test episodes. Execute 500 bootstrap iterations to compute 95% confidence intervals on Event Recall, Warning Lead Time (minutes), and False Alarms/Day. Output the results to a structured JSON artifact."*
- **Outcome**:
  - Proved AeroCold achieves **12.2 min early warning window** (vs 0 min for Baseline 1) and cuts false alarms down from 20.03 to **14.08/day** (~30% reduction) with **95.4% Event Recall**.
  - Generated `backend/models/eval_results.json`.

---

### 7. Real-Time Telemetry Server & 9-Condition Automated Verification
- **Prompt**:
  > *"Build a FastAPI server supporting bi-directional WebSockets: `ws://localhost:8000/ws/ingest` for incoming sensor lines and `ws://localhost:8000/ws/live` for dashboard broadcasting. Write an automated pytest suite covering all 9 project requirements: door-open recovery ending low, cooling failure warning early, K=3 reboot persistence, temporal causality, and sparse cadence handling."*
- **Outcome**:
  - Implemented `backend/app/main.py`.
  - Created `backend/tests/test_aerocold.py`; verified all 9/9 unit tests pass synchronously.

---

### 8. Enterprise Medical Command Center UI
- **Prompt**:
  > *"Develop a modern, high-contrast dark-mode command center in React, TypeScript, and Recharts. Include an animated semicircular SVG needle risk dial, a TreeSHAP waterfall diagram displaying positive/negative risk contributors, an interactive 2–8°C regulatory threshold graph, a Fleet Overview with KPI cards, and a side-by-side simulation scrubber."*
- **Outcome**:
  - Implemented full frontend under `frontend/src/` running on Vite + React.
  - Zero placeholder assets; fully interactive responsive interface.

---

### 9. Multi-Unit Fleet Expansion (Units U1 through U5)
- **Prompt**:
  > *"Expand our demonstrator fleet from 2 units to 5 distinct logistics nodes (U1 through U5) monitoring mRNA vaccines, insulin, pediatric biologics, vaccines, and plasma. Ensure the 5 units demonstrate the entire spectrum of cold-chain operations: Nominal cycling (Low), Door recovery (Low), Thermal creep under heatwave (Medium Early Warning), Compressor failure (High K=3), and Sensor glitch rejection (Low)."*
- **Outcome**:
  - Configured rich multi-reading operational profiles for U1..U5 in SQLite and `stream_samples.py`.
  - Enabled live scenario streaming and fleet overview filtering across Low, Medium, and High risk tiers.

---

### 10. Live IoT Auto-Stream Simulator for Presentations
- **Prompt**:
  > *"Add a live presentation controller with an 'Auto-Stream Live' toggle that emits simulated IoT readings every 2.5 seconds directly over the WebSocket. The dashboard dials, line graphs, and SHAP factor bars should dynamically scroll and update in real-time in front of the jury, accompanied by quick 1-click incident buttons for door opening and power loss."*
- **Outcome**:
  - Implemented `/api/demo/tick-live` and `/api/demo/event` in FastAPI.
  - Added live ticking toggle and 1-click incident buttons in `DemoControlBar.tsx`.
