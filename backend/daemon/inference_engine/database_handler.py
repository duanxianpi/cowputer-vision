"""
DatabaseHandler — bulk-writes ``TrackingData`` records via the Django ORM.

All timestamp values are stored as **millisecond Unix epoch** integers to
align with FFmpeg's wall-clock timestamps and the ``TrackingData`` model's
``BigIntegerField``.
"""

import logging
import time
from typing import List

from django.db import DatabaseError

from daemon.inference_engine.behavior_classifier import Detection

logger = logging.getLogger(__name__)

# Lazy import — the model is only available after django.setup()
_TrackingData = None


def _get_model():
    global _TrackingData
    if _TrackingData is None:
        from api.models import TrackingData

        _TrackingData = TrackingData
    return _TrackingData


class DatabaseHandler:
    """Write detection batches to PostgreSQL via Django ORM.

    Parameters
    ----------
    max_retries : int
        Number of retry attempts on transient DB errors.
    retry_delay : float
        Base delay (seconds) between retries (doubles each attempt).
    """

    def __init__(self, max_retries: int = 3, retry_delay: float = 1.0) -> None:
        self._max_retries = max_retries
        self._retry_delay = retry_delay

    def write_batch(
        self,
        detections: List[Detection],
    ) -> None:
        """Persist a list of detections, each carrying its own timestamp.

        Parameters
        ----------
        detections : list[Detection]
            Output of ``BehaviorClassifier.classify()``.  Each detection
            has a ``.timestamp`` (epoch seconds) from the frame it was
            detected in.
        """
        if not detections:
            return

        TrackingData = _get_model()

        objects = [
            TrackingData(
                cow_id=f"cow_{det.track_id}",
                timestamp=int(det.timestamp * 1000),
                behavior=det.behavior,
                bbox=det.bbox,
            )
            for det in detections
        ]

        delay = self._retry_delay
        for attempt in range(1, self._max_retries + 1):
            try:
                TrackingData.objects.bulk_create(objects)
                logger.debug("Wrote %d tracking records", len(objects))
                return
            except DatabaseError as exc:
                logger.warning(
                    "DB write failed (attempt %d/%d): %s",
                    attempt,
                    self._max_retries,
                    exc,
                )
                if attempt < self._max_retries:
                    time.sleep(delay)
                    delay *= 2
                else:
                    logger.error(
                        "DB write permanently failed after %d attempts",
                        self._max_retries,
                    )
