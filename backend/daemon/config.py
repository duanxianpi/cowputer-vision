"""
Centralized configuration for Intelligence Daemon processes.

All values are read from environment variables with sensible defaults.
The RTSP URL can also be read from the AppConfig database record at runtime.
"""

import os


# ---------------------------------------------------------------------------
# RTSP / Video Source
# ---------------------------------------------------------------------------
RTSP_URL: str = os.getenv("RTSP_URL")

# ---------------------------------------------------------------------------
# YOLO Model
# ---------------------------------------------------------------------------
MODEL_PATH: str = os.getenv("MODEL_PATH")

# Mapping from model class index → human-readable behavior label.
# Override via BEHAVIOR_MAP env var as JSON, e.g. '{"0":"walking","1":"standing"}'
# When the model is detection-only every detection defaults to "unknown".
BEHAVIOR_MAP: dict[int, str] = {
    0: "unknown",
    1: "walking",
    2: "standing",
    3: "feeding_head_up",
    4: "feeding_head_down",
    5: "licking",
    6: "drinking",
    7: "lying",
}
_behavior_map_env = os.getenv("BEHAVIOR_MAP")
if _behavior_map_env:
    import json

    BEHAVIOR_MAP = {int(k): v for k, v in json.loads(_behavior_map_env).items()}

# If True, the classifier treats *all* detections as a single class (cow)
# and sets behavior to "unknown". Use this when running a detection-only model.
DETECTION_ONLY_MODE: bool = os.getenv("DETECTION_ONLY_MODE", "false").lower() == "true"

# ---------------------------------------------------------------------------
# Inference tuning
# ---------------------------------------------------------------------------
INFERENCE_INTERVAL: float = float(
    os.getenv("INFERENCE_INTERVAL", "0")
)  # seconds between inferences; 0 = unlimited (as fast as GPU allows)
CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
# YOLO class indices to detect.  Comma-separated, e.g. "0,19"
# Defaults to ALL keys in BEHAVIOR_MAP so multi-class models work out-of-the-box.
_detection_classes_env = os.getenv("DETECTION_CLASSES")
DETECTION_CLASSES: list[int] = (
    [int(c) for c in _detection_classes_env.split(",") if c.strip()]
    if _detection_classes_env
    else sorted(BEHAVIOR_MAP.keys())
)
MIN_BBOX_AREA: int = int(os.getenv("MIN_BBOX_AREA", "1000"))  # px²
DB_WRITE_BATCH_SIZE: int = int(os.getenv("DB_WRITE_BATCH_SIZE", "50"))
DB_WRITE_INTERVAL: float = float(
    os.getenv("DB_WRITE_INTERVAL", "1.0")
)  # seconds; flush batch at least this often

# ---------------------------------------------------------------------------
# HLS / Media paths  (relative to project root or absolute)
# ---------------------------------------------------------------------------
STORAGE_DIR: str = os.getenv(
    "STORAGE_DIR", os.path.join(os.path.dirname(__file__), "..", "storage")
)
HLS_DIR: str = os.getenv("HLS_DIR", os.path.join(STORAGE_DIR, "hls"))
REC_DIR: str = os.getenv("REC_DIR", os.path.join(STORAGE_DIR, "rec"))
REC_INDEX_FILE: str = os.getenv("REC_INDEX_FILE", os.path.join(REC_DIR, "index.m3u8"))

# ---------------------------------------------------------------------------
# Retention
# ---------------------------------------------------------------------------
RETENTION_DAYS: int = int(os.getenv("RETENTION_DAYS", "30"))
RETENTION_MAX_DISK_GB: float = float(os.getenv("RETENTION_MAX_DISK_GB", "100"))
RETENTION_CHECK_INTERVAL: int = int(
    os.getenv("RETENTION_CHECK_INTERVAL", "3600")
)  # seconds

# ---------------------------------------------------------------------------
# Event Monitor
# ---------------------------------------------------------------------------
EVENT_POLL_INTERVAL: float = float(os.getenv("EVENT_POLL_INTERVAL", "1.0"))  # seconds
EVENT_LOOKBACK_SECONDS: int = int(os.getenv("EVENT_LOOKBACK_SECONDS", "60"))
ALERT_DEDUP_MINUTES: int = int(os.getenv("ALERT_DEDUP_MINUTES", "5"))
ALERT_RULE_REFRESH_SECONDS: int = int(os.getenv("ALERT_RULE_REFRESH_SECONDS", "30"))

# ---------------------------------------------------------------------------
# Notification Dispatch
# ---------------------------------------------------------------------------
DEFAULT_FROM_EMAIL: str = os.getenv(
    "DEFAULT_FROM_EMAIL", "alerts@cowputer-vision.local"
)
WEBHOOK_TIMEOUT: int = int(os.getenv("WEBHOOK_TIMEOUT", "10"))  # seconds

# ---------------------------------------------------------------------------
# Report Manager
# ---------------------------------------------------------------------------
REPORT_SCHEDULE_HOUR: int = int(
    os.getenv("REPORT_SCHEDULE_HOUR", "0")
)  # 0-23, midnight
REPORT_SCHEDULE_MINUTE: int = int(os.getenv("REPORT_SCHEDULE_MINUTE", "0"))

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_LEVEL: str = os.getenv("DAEMON_LOG_LEVEL", "INFO")
