# AeroCold - Assumptions Log

This document records architectural, operational, and algorithmic assumptions made during development in accordance with the specification.

1. **Synthetic Data Transparency**: All training, evaluation, and simulation data is synthetically produced by `sim/simulator.py` using physical thermal models (Newton's law of cooling, hysteresis thermostat, ambient sine fluctuations, and door disturbance profiles). No real patient/vaccine hospital data was accessed.
2. **Excursion Definition**: Standard medical cold-storage limits are 2.0 C to 8.0 C. An excursion is strictly defined as true storage temperature `true_c > 8.0 C` (or `< 2.0 C`, focused primarily on upper excursion risk `> 8.0 C` per hackathon specification).
3. **Time Window**: Risk prediction window is 30 minutes into the future.
4. **Causality & Timestamping**: Streaming events arrive with explicit unix timestamps `ts` (in seconds). All slope, acceleration, window statistics, and safety overrides strictly filter `ts <= current_ts` and never query wall-clock time or future rows.
5. **K=3 Persistence Rule**: High/Medium excursion alert requires K=3 consecutive readings evaluated at Medium or High risk stored in SQLite history to avoid intermittent transient alarm fatigue.
6. **Persistence Across Reboots**: State is completely persisted in SQLite (`aerocold.db` in WAL mode). No in-memory state leakage across server lifecycles.
