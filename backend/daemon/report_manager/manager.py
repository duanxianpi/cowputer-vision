"""
ReportManager — scheduled daily report generation.
"""

import logging
import signal
import threading
import time
from datetime import datetime, timezone

from daemon import config
from daemon.report_manager.report_generator import ReportGenerator
from daemon.report_manager.report_storage import ReportStorage

logger = logging.getLogger(__name__)

_Setting = None


def _get_setting_model():
    global _Setting
    if _Setting is None:
        from api.models import Setting

        _Setting = Setting
    return _Setting


class ReportManager:
    """Waits until the configured report hour, generates a daily report,
    saves it, then sleeps until the next day.
    """

    def __init__(self) -> None:
        self._generator = ReportGenerator()
        self._storage = ReportStorage()
        self._stop_event = threading.Event()

    def run(self) -> None:
        """Blocking main loop."""
        self._install_signal_handlers()
        logger.info(
            "ReportManager running (schedule=%02d:%02d UTC)",
            self._get_schedule_hour(),
            self._get_schedule_minute(),
        )

        while not self._stop_event.is_set():
            sleep_secs = self._seconds_until_next_run()
            logger.info(
                "Next report in %.0f seconds (%.1f hours)",
                sleep_secs,
                sleep_secs / 3600,
            )

            # Interruptible wait
            if self._stop_event.wait(timeout=sleep_secs):
                break  # stop was requested

            self._generate_and_save()

        logger.info("ReportManager stopped")

    def stop(self) -> None:
        self._stop_event.set()

    def generate_now(self) -> None:
        """On-demand report generation (useful for testing)."""
        self._generate_and_save()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _generate_and_save(self) -> None:
        try:
            data = self._generator.generate_daily_report()
            self._storage.save(report_type="daily", data=data)
        except Exception as exc:
            logger.exception("Report generation failed: %s", exc)

    def _get_schedule_hour(self) -> int:
        """Read report_hour from DB Setting, falling back to env-var config."""
        try:
            Setting = _get_setting_model()
            row = Setting.objects.filter(key="report_hour").first()
            if row is not None:
                return int(row.value)
        except Exception as exc:
            logger.warning("Could not read report_hour from DB: %s", exc)
        return config.REPORT_SCHEDULE_HOUR

    def _get_schedule_minute(self) -> int:
        """Read report_minute from DB Setting, falling back to env-var config."""
        try:
            Setting = _get_setting_model()
            row = Setting.objects.filter(key="report_minute").first()
            if row is not None:
                return int(row.value)
        except Exception as exc:
            logger.warning("Could not read report_minute from DB: %s", exc)
        return config.REPORT_SCHEDULE_MINUTE

    def _seconds_until_next_run(self) -> float:
        """Seconds until the next scheduled report time."""
        from datetime import timedelta

        now = datetime.now(tz=timezone.utc)
        target = now.replace(
            hour=self._get_schedule_hour(),
            minute=self._get_schedule_minute(),
            second=0,
            microsecond=0,
        )
        if target <= now:
            # Already past today's target → schedule for tomorrow
            target += timedelta(days=1)
        return (target - now).total_seconds()

    def _install_signal_handlers(self) -> None:
        def _handler(signum, _frame):
            logger.info("Received signal %d — shutting down", signum)
            self.stop()

        signal.signal(signal.SIGTERM, _handler)
        signal.signal(signal.SIGINT, _handler)
