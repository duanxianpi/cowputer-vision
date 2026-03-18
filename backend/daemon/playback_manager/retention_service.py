"""
RetentionService — deletes old video segments from disk and database
based on age and disk-usage thresholds.
"""

import logging
import os
import shutil
import time
import threading
from typing import Optional

from daemon import config

logger = logging.getLogger(__name__)

_VideoSegment = None
_Setting = None


def _get_model():
    global _VideoSegment
    if _VideoSegment is None:
        from api.models import VideoSegment

        _VideoSegment = VideoSegment
    return _VideoSegment


def _get_setting_model():
    global _Setting
    if _Setting is None:
        from api.models import Setting

        _Setting = Setting
    return _Setting


class RetentionService:
    """Periodic cleanup of old recording segments.

    Runs on a background thread, checking every
    ``config.RETENTION_CHECK_INTERVAL`` seconds.

    Two independent policies apply:

    1. **Age-based** — segments older than ``RETENTION_DAYS`` are deleted.
    2. **Disk-based** — if ``REC_DIR`` exceeds ``RETENTION_MAX_DISK_GB``,
       the oldest segments are deleted until the usage drops below the
       threshold.
    """

    def __init__(
        self,
        rec_dir: Optional[str] = None,
        check_interval: Optional[int] = None,
    ) -> None:
        self._rec_dir = rec_dir or config.REC_DIR
        self._check_interval = check_interval or config.RETENTION_CHECK_INTERVAL
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        logger.info(
            "RetentionService started (interval=%ds, age=%dd, disk=%.0f GB)",
            self._check_interval,
            config.RETENTION_DAYS,
            config.RETENTION_MAX_DISK_GB,
        )

    def stop(self) -> None:
        self._running = False
        if self._thread is not None:
            self._thread.join(timeout=10)
        logger.info("RetentionService stopped")

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _get_retention_days(self) -> int:
        """Read retention_days from DB Setting model, falling back to env-var config."""
        try:
            Setting = _get_setting_model()
            row = Setting.objects.filter(key="retention_days").first()
            if row is not None:
                return int(row.value)
        except Exception as exc:
            logger.warning("Could not read retention_days from DB: %s", exc)
        return config.RETENTION_DAYS

    def _get_retention_max_disk_gb(self) -> float:
        """Read retention_max_disk_gb from DB Setting model, falling back to env-var config."""
        try:
            Setting = _get_setting_model()
            row = Setting.objects.filter(key="retention_max_disk_gb").first()
            if row is not None:
                return float(row.value)
        except Exception as exc:
            logger.warning("Could not read retention_max_disk_gb from DB: %s", exc)
        return config.RETENTION_MAX_DISK_GB

    def _loop(self) -> None:
        while self._running:
            try:
                self._cleanup_by_age()
                self._cleanup_by_disk()
            except Exception as exc:
                logger.exception("RetentionService error: %s", exc)
            # Interruptible sleep
            for _ in range(self._check_interval):
                if not self._running:
                    return
                time.sleep(1)

    def _cleanup_by_age(self) -> None:
        VideoSegment = _get_model()
        retention_days = self._get_retention_days()
        now_ms = int(time.time() * 1000)
        cutoff_ms = now_ms - (retention_days * 86400 * 1000)

        old_segments = VideoSegment.objects.filter(start_ts__lt=cutoff_ms)
        count = 0
        for seg in old_segments.iterator():
            self._delete_file(seg.file_path)
            seg.delete()
            count += 1

        if count:
            logger.info(
                "Age-based cleanup: deleted %d segments (retention=%d days)",
                count,
                retention_days,
            )

    def _cleanup_by_disk(self) -> None:
        retention_max = self._get_retention_max_disk_gb()
        usage = self._dir_size_gb(self._rec_dir)
        if usage <= retention_max:
            return

        logger.info(
            "Disk usage %.2f GB exceeds limit %.2f GB — purging oldest segments",
            usage,
            retention_max,
        )

        VideoSegment = _get_model()

        while usage > retention_max:
            oldest = VideoSegment.objects.order_by("start_ts").first()
            if oldest is None:
                logger.warning(
                    "No more segments in DB but disk usage is still %.2f GB "
                    "(orphaned files not tracked in DB may be present in %s)",
                    usage,
                    self._rec_dir,
                )
                break
            file_size = self._file_size_gb(oldest.file_path)
            deleted = self._delete_file(oldest.file_path)
            if not deleted:
                # File could not be removed — leave the DB record intact so we
                # can retry on the next check cycle, and stop this cycle.
                logger.warning(
                    "Stopping disk cleanup early: could not delete %s. "
                    "Disk usage remains %.2f GB (limit %.2f GB).",
                    oldest.file_path,
                    usage,
                    retention_max,
                )
                break
            oldest.delete()
            usage -= file_size

        logger.info("Disk cleanup complete — current usage %.2f GB", usage)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _delete_file(path: str) -> bool:
        """Delete *path* from disk.

        Returns ``True`` if the file was removed or did not exist (i.e. it no
        longer occupies disk space).  Returns ``False`` if removal failed.
        """
        try:
            if os.path.isfile(path):
                os.remove(path)
                logger.debug("Deleted file: %s", path)
            return True
        except OSError as exc:
            logger.warning("Could not delete %s: %s", path, exc)
            return False

    @staticmethod
    def _file_size_gb(path: str) -> float:
        """Return the size of *path* in gigabytes, or 0 if it cannot be read."""
        try:
            return os.path.getsize(path) / (1024**3)
        except OSError:
            return 0.0

    @staticmethod
    def _dir_size_gb(path: str) -> float:
        """Return the total size of *path* in gigabytes."""
        total = 0
        for dirpath, _dirnames, filenames in os.walk(path):
            for fname in filenames:
                fp = os.path.join(dirpath, fname)
                try:
                    total += os.path.getsize(fp)
                except OSError:
                    pass
        return total / (1024**3)
