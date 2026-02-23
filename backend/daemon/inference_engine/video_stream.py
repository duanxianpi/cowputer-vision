"""
VideoStream — threaded RTSP frame reader with automatic reconnection.

Reads frames from an RTSP (or any OpenCV-compatible) source in a background
daemon thread.  The latest frame and its wall-clock timestamp are always
available via ``read()``.
"""

import logging
import threading
import time
from typing import Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class VideoStream:
    """Non-blocking video capture with exponential-backoff reconnection."""

    _MAX_RECONNECT_DELAY = 30.0  # seconds

    def __init__(self, src: str) -> None:
        self._src = src
        self._stream: Optional[cv2.VideoCapture] = None
        self._started = False
        self._latest_frame: Optional[np.ndarray] = None
        self._latest_ts: float = 0.0
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def start(self) -> "VideoStream":
        """Open the capture and launch the reader thread."""
        if self._started:
            return self
        self._stream = cv2.VideoCapture(self._src)
        self._started = True
        self._thread = threading.Thread(target=self._update, daemon=True)
        self._thread.start()
        logger.info("VideoStream started for %s", self._src)
        return self

    def read(self) -> Tuple[Optional[np.ndarray], float]:
        """Return the most recent ``(frame, timestamp)`` pair.

        Returns ``(None, 0.0)`` if no frame has been captured yet.
        """
        with self._lock:
            if self._latest_frame is not None:
                return self._latest_frame.copy(), self._latest_ts
            return None, 0.0

    def is_alive(self) -> bool:
        """Return *True* if the reader thread is running."""
        return self._thread is not None and self._thread.is_alive()

    def stop(self) -> None:
        """Signal the thread to stop and release the capture."""
        self._started = False
        if self._thread is not None:
            self._thread.join(timeout=5)
        if self._stream is not None:
            self._stream.release()
        logger.info("VideoStream stopped")

    # Context-manager support -------------------------------------------

    def __enter__(self) -> "VideoStream":
        return self.start()

    def __exit__(self, *exc) -> None:
        self.stop()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _update(self) -> None:
        reconnect_delay = 1.0
        while self._started:
            ret, frame = self._stream.read()  # type: ignore[union-attr]
            if ret:
                with self._lock:
                    self._latest_frame = frame
                    self._latest_ts = time.time()
                reconnect_delay = 1.0  # reset on success
            else:
                logger.warning(
                    "Stream lost — reconnecting in %.1fs …", reconnect_delay
                )
                time.sleep(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 2, self._MAX_RECONNECT_DELAY)
                if self._stream is not None:
                    self._stream.release()
                self._stream = cv2.VideoCapture(self._src)
