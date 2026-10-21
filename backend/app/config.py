import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("AEROCOLD_DATA_DIR", str(BASE_DIR / "data")))
MODELS_DIR = Path(os.getenv("AEROCOLD_MODELS_DIR", str(BASE_DIR / "models")))
DB_PATH = Path(os.getenv("AEROCOLD_DB", str(DATA_DIR / "aerocold.db")))

DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Feature list: strict order defined by specification
FEATURE_NAMES = [
    "storage_c",
    "ambient_c",
    "dist_to_8",
    "dist_to_2",
    "door",
    "cooling",
    "slope_1m",
    "slope_3m",
    "slope_5m",
    "slope_10m",
    "accel",
    "mean_5m",
    "std_5m",
    "max_15m",
    "door_open_count_10m",
    "minutes_since_door_close",
    "minutes_since_door_open",
    "cooling_on_frac_10m",
    "minutes_since_cooling_off",
    "ambient_minus_storage",
]

# Risk classification thresholds (validation set calibrated fallback defaults)
DEFAULT_THRESHOLDS = {
    "low": 0.30,
    "medium": 0.60,
}

# Persistence rule
K_PERSISTENCE = 3

# Safety layer rule thresholds
SAFETY_RECOVERING_CAP = 0.10
SAFETY_DOOR_OPEN_CAP = 0.45
SAFETY_COOLING_OFF_TTX30_FLOOR = 0.75
SAFETY_COOLING_OFF_TTX60_FLOOR = 0.45
