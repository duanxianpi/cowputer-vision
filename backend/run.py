#!/usr/bin/env python
"""
Cowputer Vision — Unified Backend Entry Point
===============================================

Loads environment variables from ``.env`` and launches the selected backend
processes.  This is the **only** place ``python-dotenv`` is called so that
every module — Django settings, daemon config, and the media-server shell
scripts — automatically inherits a consistent environment.

Usage examples::

    # Start everything (Django + all daemons + media server)
    python run.py all

    # Start only the Django API server
    python run.py django

    # Start a single daemon
    python run.py daemon inference_engine

    # Start specific daemons
    python run.py daemon inference_engine event_monitor

    # Start all four daemons (no Django, no media server)
    python run.py daemon --all

    # Start the FFmpeg media server
    python run.py media
"""

from __future__ import annotations

import argparse
import logging
import os
import signal
import subprocess
import sys
import textwrap
import threading
from pathlib import Path

# ---------------------------------------------------------------------------
# 1. Load .env BEFORE any other project import
# ---------------------------------------------------------------------------
from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent
_ENV_FILE = _BACKEND_DIR / ".env"

if _ENV_FILE.is_file():
    load_dotenv(_ENV_FILE, override=False)
else:
    print(
        f"[run.py] WARNING: {_ENV_FILE} not found. "
        "Falling back to existing environment variables.\n"
        "         Copy .env.example → .env and fill in your values.",
        file=sys.stderr,
    )

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DAEMON_NAMES = [
    "inference_engine",
    "event_monitor",
    "playback_manager",
    "report_manager",
]

logger = logging.getLogger("run")


# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
def _print_banner(processes: list[str]) -> None:
    db_host = os.environ.get("DB_HOST", "?")
    db_name = os.environ.get("DB_NAME", "?")
    db_user = os.environ.get("DB_USER", "?")
    rtsp = os.environ.get("RTSP_URL", "?")
    log_level = os.environ.get("DAEMON_LOG_LEVEL", "INFO")

    banner = textwrap.dedent(
        f"""\
    ============================================================
      Cowputer Vision — Backend Launcher
    ============================================================
      Processes : {', '.join(processes)}
      Database  : postgresql://{db_user}@{db_host}/{db_name}
      RTSP URL  : {rtsp}
      Log level : {log_level}
    ============================================================
    """
    )
    print(banner)


# ---------------------------------------------------------------------------
# Process launchers
# ---------------------------------------------------------------------------
_children: list[subprocess.Popen] = []  # child processes to clean up


def _launch_django() -> subprocess.Popen:
    """Start the Django development server as a subprocess."""
    manage_py = _BACKEND_DIR / "core_app" / "manage.py"
    host = os.environ.get("DJANGO_HOST", "0.0.0.0")
    port = os.environ.get("DJANGO_PORT", "8000")

    proc = subprocess.Popen(
        [sys.executable, str(manage_py), "runserver", f"{host}:{port}"],
        cwd=str(_BACKEND_DIR / "core_app"),
        env=os.environ.copy(),
    )
    _children.append(proc)
    logger.info("Django dev server started  (PID %d) on %s:%s", proc.pid, host, port)
    return proc


def _launch_daemon(name: str) -> subprocess.Popen:
    """
    Start a daemon as a subprocess.

    Each daemon needs its own main thread so it can install signal handlers.
    """
    proc = subprocess.Popen(
        [sys.executable, "-m", f"daemon.{name}"],
        cwd=str(_BACKEND_DIR),
        env=os.environ.copy(),
    )
    _children.append(proc)
    logger.info("Daemon %-20s started  (PID %d)", name, proc.pid)
    return proc


def _launch_media_server() -> subprocess.Popen | None:
    """Start media_server/start.sh as a subprocess (Linux/macOS only)."""
    start_sh = _BACKEND_DIR / "media_server" / "start.sh"
    if not start_sh.is_file():
        logger.warning("media_server/start.sh not found — skipping media server")
        return None

    if sys.platform == "win32":
        # Try running via Git Bash / WSL if available
        bash = "bash"
        proc = subprocess.Popen(
            [bash, str(start_sh)],
            cwd=str(_BACKEND_DIR / "media_server"),
            env=os.environ.copy(),
        )
    else:
        proc = subprocess.Popen(
            [str(start_sh)],
            cwd=str(_BACKEND_DIR / "media_server"),
            env=os.environ.copy(),
        )

    _children.append(proc)
    logger.info("Media server started  (PID %d)", proc.pid)
    return proc


# ---------------------------------------------------------------------------
# Graceful shutdown
# ---------------------------------------------------------------------------
_shutting_down = threading.Event()


def _shutdown(signum: int | None = None, frame=None) -> None:
    """Terminate all child processes and exit."""
    if _shutting_down.is_set():
        return
    _shutting_down.set()

    sig_name = signal.Signals(signum).name if signum else "?"
    logger.info("Received %s — shutting down …", sig_name)

    for proc in _children:
        if proc.poll() is None:
            logger.info("Terminating PID %d …", proc.pid)
            proc.terminate()

    for proc in _children:
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            logger.warning("PID %d did not exit in time — killing", proc.pid)
            proc.kill()

    logger.info("All processes stopped.")


def _wait_forever() -> NoReturn:
    """Block the main thread until a signal is received."""
    try:
        _shutting_down.wait()
    except KeyboardInterrupt:
        _shutdown()
    sys.exit(0)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="run.py",
        description="Cowputer Vision — unified backend entry point.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # python run.py all
    sub.add_parser("all", help="Start Django + all daemons + media server")

    # python run.py django
    sub.add_parser("django", help="Start the Django API server only")

    # python run.py daemon [--all | name ...]
    daemon_p = sub.add_parser("daemon", help="Start one or more daemons")
    daemon_g = daemon_p.add_mutually_exclusive_group(required=True)
    daemon_g.add_argument(
        "--all",
        action="store_true",
        dest="all_daemons",
        help="Start all four daemons",
    )
    daemon_g.add_argument(
        "names",
        nargs="*",
        default=[],
        choices=DAEMON_NAMES + [[]],  # allow empty default
        metavar="NAME",
        help=f"Daemon(s) to start: {', '.join(DAEMON_NAMES)}",
    )

    # python run.py media
    sub.add_parser("media", help="Start the FFmpeg media server only")

    return parser


def main(argv: list[str] | None = None) -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s  %(message)s",
    )

    parser = _build_parser()
    args = parser.parse_args(argv)

    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    processes: list[str] = []

    if args.command == "all":
        processes.append("django")
        _launch_django()

        for name in DAEMON_NAMES:
            processes.append(f"daemon:{name}")
            _launch_daemon(name)

        processes.append("media_server")
        _launch_media_server()

    elif args.command == "django":
        processes.append("django")
        _launch_django()

    elif args.command == "daemon":
        names = DAEMON_NAMES if args.all_daemons else args.names
        if not names:
            parser.error("Specify daemon names or use --all")
        for name in names:
            if name not in DAEMON_NAMES:
                parser.error(
                    f"Unknown daemon '{name}'. "
                    f"Choose from: {', '.join(DAEMON_NAMES)}"
                )
            processes.append(f"daemon:{name}")
            _launch_daemon(name)

    elif args.command == "media":
        processes.append("media_server")
        _launch_media_server()

    _print_banner(processes)
    _wait_forever()


if __name__ == "__main__":
    main()
