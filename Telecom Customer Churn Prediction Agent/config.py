"""
TeleGuard AI — Configuration
=============================
All environment-tunable settings in one place. Override via env vars for
deployment; sensible local-dev defaults otherwise.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _path_from_env(name: str, default: str) -> str:
    value = os.environ.get(name, default)
    path = Path(value)
    if not path.is_absolute():
        path = BASE_DIR / path
    return str(path)

# Path to the model.pkl bundle produced by Step 1's train_model.py
MODEL_PATH = _path_from_env("TELEGUARD_MODEL_PATH", "model.pkl")

# Path to the customer roster CSV (same Telco-schema CSV used for training;
# in this hackathon build it doubles as the "live" customer base since
# there's no separate transactional DB — see README for the production note)
DATA_PATH = _path_from_env(
    "TELEGUARD_DATA_PATH", "WA_Fn-UseC_-Telco-Customer-Churn.csv"
)

# Comma-separated list of allowed frontend origins for CORS
CORS_ORIGINS = os.environ.get(
    "TELEGUARD_CORS_ORIGINS", 
    "http://localhost:5173,http://127.0.0.1:5173,https://telegaurd-frontend.vercel.app"
).split(",")

DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 200