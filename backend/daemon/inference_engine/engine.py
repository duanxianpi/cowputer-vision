"""
InferenceEngine — main orchestrator for real-time video inference.

Reads frames from the RTSP stream via ``VideoStream``, runs YOLO tracking
via ``BehaviorClassifier``, and writes results to the database via
``DatabaseHandler``.
"""

import logging
import signal
import time

from daemon import config
from daemon.inference_engine.video_stream import VideoStream
from daemon.inference_engine.behavior_classifier import BehaviorClassifier
from daemon.inference_engine.database_handler import DatabaseHandler

logger = logging.getLogger(__name__)


class InferenceEngine:
    """Production-grade inference loop.

    Parameters
    ----------
    rtsp_url : str | None
        RTSP stream URL.  Defaults to ``config.RTSP_URL``; if that is
        empty the URL is read from ``AppConfig`` in the database.
    model_path : str | None
        Path to the YOLO weights.  Defaults to ``config.MODEL_PATH``.
    """

    def __init__(
        self,
        rtsp_url: str | None = None,
        model_path: str | None = None,
    ) -> None:
        self._rtsp_url = rtsp_url or config.RTSP_URL
        self._model_path = model_path
        self._interval = config.INFERENCE_INTERVAL
        self._batch_size = config.DB_WRITE_BATCH_SIZE
        self._flush_interval = config.DB_WRITE_INTERVAL
        self._running = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(self) -> None:
        """Blocking main loop — call from the entry-point script."""
        self._running = True
        self._install_signal_handlers()

        # Resolve RTSP URL from DB if not provided
        if not self._rtsp_url:
            self._rtsp_url = self._rtsp_url_from_db()
        logger.info("RTSP URL: %s", self._rtsp_url)

        classifier = BehaviorClassifier(self._model_path)
        db_handler = DatabaseHandler()

        with VideoStream(self._rtsp_url) as stream:
            logger.info("InferenceEngine running (interval=%.2fs)", self._interval)
            self._loop(stream, classifier, db_handler)

        logger.info("InferenceEngine stopped")

    def stop(self) -> None:
        """Signal the main loop to exit."""
        logger.info("Stop requested")
        self._running = False

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _loop(
        self,
        stream: VideoStream,
        classifier: BehaviorClassifier,
        db_handler: DatabaseHandler,
    ) -> None:
        last_inference_time = 0.0
        batch = []
        last_flush_time = time.time()

        # FPS tracking
        # fps_frame_count = 0
        # fps_start_time = time.time()
        # fps_log_interval = 5.0  # log FPS every 5 seconds

        while self._running:
            frame, ts = stream.read()

            now = time.time()
            if frame is None:
                # No frame available, but still check batch flush
                if batch and (now - last_flush_time) >= self._flush_interval:
                    db_handler.write_batch(batch)
                    batch.clear()
                    last_flush_time = now
                time.sleep(0.005)
                continue

            if self._interval > 0 and (now - last_inference_time) < self._interval:
                # FPS limiter active — skip this frame
                if batch and (now - last_flush_time) >= self._flush_interval:
                    db_handler.write_batch(batch)
                    batch.clear()
                    last_flush_time = now
                time.sleep(0.005)
                continue

            last_inference_time = now
            detections = classifier.classify(frame)

            # Stamp each detection with the frame's capture timestamp
            for det in detections:
                det.timestamp = ts

            # Update FPS counter
            # fps_frame_count += 1
            # elapsed = now - fps_start_time
            # if elapsed >= fps_log_interval:
            #     current_fps = fps_frame_count / elapsed
            #     logger.info("Inference FPS: %.2f", current_fps)
            #     fps_frame_count = 0
            #     fps_start_time = now

            if detections:
                batch.extend(detections)

            # Flush if batch is large enough or flush interval elapsed
            if batch and (
                len(batch) >= self._batch_size
                or (now - last_flush_time) >= self._flush_interval
            ):
                db_handler.write_batch(batch)
                batch.clear()
                last_flush_time = now

        # Flush remaining
        if batch:
            db_handler.write_batch(batch)

    def _install_signal_handlers(self) -> None:
        """Graceful shutdown on SIGTERM / SIGINT."""

        def _handler(signum, frame):
            logger.info("Received signal %d — shutting down", signum)
            self.stop()

        signal.signal(signal.SIGTERM, _handler)
        signal.signal(signal.SIGINT, _handler)

    @staticmethod
    def _rtsp_url_from_db() -> str:
        """Fall back to reading the RTSP URL from ``AppConfig``."""
        from api.models import AppConfig

        try:
            cfg = AppConfig.objects.first()
            if cfg and cfg.rtsp_url:
                return cfg.rtsp_url
        except Exception as exc:
            logger.warning("Could not read AppConfig: %s", exc)
        raise RuntimeError(
            "No RTSP URL configured.  Set the RTSP_URL env var or "
            "populate AppConfig in the database."
        )
