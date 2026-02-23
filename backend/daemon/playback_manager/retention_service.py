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


def _get_model():
    global _VideoSegment
    if _VideoSegment is None:
        from api.models import VideoSegment
        _VideoSegment = VideoSegment
    return _VideoSegment


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
        now_ms = int(time.time() * 1000)
        cutoff_ms = now_ms - (config.RETENTION_DAYS * 86400 * 1000)

        old_segments = VideoSegment.objects.filter(start_ts__lt=cutoff_ms)
        count = 0
        for seg in old_segments:
            self._delete_file(seg.file_path)
            count += 1
        old_segments.delete()

        if count:
            logger.info("Age-based cleanup: deleted %d segments", count)

    def _cleanup_by_disk(self) -> None:
        usage = self._dir_size_gb(self._rec_dir)
        if usage <= config.RETENTION_MAX_DISK_GB:
            return

        logger.info(
            "Disk usage %.2f GB exceeds limit %.2f GB — purging oldest segments",
            usage,
            config.RETENTION_MAX_DISK_GB,
        )

        VideoSegment = _get_model()

        while usage > config.RETENTION_MAX_DISK_GB:
            oldest = VideoSegment.objects.order_by("start_ts").first()
            if oldest is None:
                break
            self._delete_file(oldest.file_path)
            oldest.delete()
            usage = self._dir_size_gb(self._rec_dir)

        logger.info("Disk cleanup complete — current usage %.2f GB", usage)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _delete_file(path: str) -> None:
        try:
            if os.path.isfile(path):
                os.remove(path)
                logger.debug("Deleted file: %s", path)
        except OSError as exc:
            logger.warning("Could not delete %s: %s", path, exc)

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
        return total / (1024 ** 3)
