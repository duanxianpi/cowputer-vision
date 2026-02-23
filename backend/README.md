# Cowputer Vision — Backend

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Install YOLOv12 (vendored fork)
#    The project uses a vendored copy at yolov12/. Install it in editable mode:
pip install -e yolov12/
#    Or install directly from upstream:
#    pip install git+https://github.com/sunsmarterjie/yolov12.git

# 3. Create your local environment file
cp .env.example .env
# Edit .env with your database credentials and other settings

# 4. Run database migrations
cd core_app && python manage.py migrate && cd ..

# 5. Start everything
python run.py all
```

## Entry Point — `run.py`

All backend processes are managed through a single entry point that loads
environment variables from `.env` before launching anything.

### Commands

| Command                                               | Description                                 |
| ----------------------------------------------------- | ------------------------------------------- |
| `python run.py all`                                   | Start Django + all 4 daemons + media server |
| `python run.py django`                                | Start the Django API server only            |
| `python run.py daemon --all`                          | Start all four daemons                      |
| `python run.py daemon inference_engine`               | Start a single daemon                       |
| `python run.py daemon inference_engine event_monitor` | Start specific daemons                      |
| `python run.py media`                                 | Start the FFmpeg media server only          |

### Available Daemons

- `inference_engine` — YOLO-based cow detection & behaviour classification
- `event_monitor` — watches detections and fires alerts based on rules
- `playback_manager` — manages HLS recording index & retention
- `report_manager` — generates scheduled reports

## Environment Variables

All configuration is centralized in a single `.env` file at the backend root.
Copy `.env.example` to `.env` and edit as needed. The file is git-ignored.

### Django

| Variable               | Default               | Description                                  |
| ---------------------- | --------------------- | -------------------------------------------- |
| `DJANGO_SECRET_KEY`    | _(insecure fallback)_ | Django secret key — **change in production** |
| `DJANGO_DEBUG`         | `True`                | Enable Django debug mode                     |
| `DJANGO_ALLOWED_HOSTS` | _(empty)_             | Comma-separated list of allowed hosts        |

### Database (PostgreSQL)

| Variable      | Default                         | Description             |
| ------------- | ------------------------------- | ----------------------- |
| `DB_ENGINE`   | `django.db.backends.postgresql` | Django database backend |
| `DB_NAME`     | `capstone`                      | Database name           |
| `DB_USER`     | `admin`                         | Database user           |
| `DB_PASSWORD` | _(empty)_                       | Database password       |
| `DB_HOST`     | `localhost`                     | Database host           |
| `DB_PORT`     | `5432`                          | Database port           |

### RTSP / Video Source

| Variable              | Default               | Description                            |
| --------------------- | --------------------- | -------------------------------------- |
| `RTSP_URL`            | `rtsp://pi:8554/test` | RTSP stream URL                        |
| `MODEL_PATH`          | `models/yolov8n.pt`   | Path to YOLO model weights             |
| `DETECTION_ONLY_MODE` | `false`               | Treat all detections as a single class |
| `BEHAVIOR_MAP`        | _(built-in)_          | JSON override for behaviour map        |

### Inference Tuning

| Variable               | Default | Description                                |
| ---------------------- | ------- | ------------------------------------------ |
| `INFERENCE_INTERVAL`   | `0.1`   | Seconds between inference frames (~10 FPS) |
| `CONFIDENCE_THRESHOLD` | `0.5`   | Minimum detection confidence               |
| `DETECTION_CLASSES`    | `0`     | Comma-separated YOLO class indices         |
| `MIN_BBOX_AREA`        | `1000`  | Minimum bounding-box area (px²)            |
| `DB_WRITE_BATCH_SIZE`  | `50`    | Detections buffered before DB write        |

### Storage / HLS

| Variable         | Default                  | Description                  |
| ---------------- | ------------------------ | ---------------------------- |
| `STORAGE_DIR`    | `storage`                | Root storage directory       |
| `HLS_DIR`        | `storage/hls`            | Live HLS segment directory   |
| `REC_DIR`        | `storage/rec`            | Archival recording directory |
| `REC_INDEX_FILE` | `storage/rec/index.m3u8` | Archival HLS index file      |

### Retention

| Variable                   | Default | Description                            |
| -------------------------- | ------- | -------------------------------------- |
| `RETENTION_DAYS`           | `30`    | Maximum age of recordings (days)       |
| `RETENTION_MAX_DISK_GB`    | `100`   | Maximum disk usage for recordings (GB) |
| `RETENTION_CHECK_INTERVAL` | `3600`  | Seconds between retention checks       |

### Event Monitor

| Variable                     | Default | Description                                  |
| ---------------------------- | ------- | -------------------------------------------- |
| `EVENT_POLL_INTERVAL`        | `1.0`   | Seconds between event polls                  |
| `EVENT_LOOKBACK_SECONDS`     | `60`    | Time window for event aggregation            |
| `ALERT_DEDUP_MINUTES`        | `5`     | Suppress duplicate alerts within this window |
| `ALERT_RULE_REFRESH_SECONDS` | `30`    | How often to reload alert rules from DB      |

### Report Manager

| Variable                 | Default | Description                                 |
| ------------------------ | ------- | ------------------------------------------- |
| `REPORT_SCHEDULE_HOUR`   | `0`     | Hour (0-23) for scheduled report generation |
| `REPORT_SCHEDULE_MINUTE` | `0`     | Minute for scheduled report generation      |

### Media Server (FFmpeg)

| Variable        | Default | Description                         |
| --------------- | ------- | ----------------------------------- |
| `HLS_TIME`      | `1`     | Live segment duration (seconds)     |
| `HLS_LIST_SIZE` | `5`     | Rolling playlist window size        |
| `REC_HLS_TIME`  | `600`   | Archival segment duration (seconds) |

### Logging

| Variable           | Default | Description                        |
| ------------------ | ------- | ---------------------------------- |
| `DAEMON_LOG_LEVEL` | `INFO`  | Log level for all daemon processes |

## Architecture

The backend consists of three independent process groups that share the same
PostgreSQL database and `storage/` directory:

1. **Django API** (`core_app/`) — REST API (DRF + JWT auth)
2. **Intelligence Daemon** (`daemon/`) — four Python daemons using the Django ORM
3. **Media Server** (`media_server/`) — FFmpeg shell scripts producing dual HLS output
