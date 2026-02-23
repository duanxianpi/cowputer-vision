"""
PlaybackManager — orchestrates ``MetadataSyncer`` and ``RetentionService``.
"""

import logging
import signal
import threading

from daemon.playback_manager.metadata_syncer import MetadataSyncer
from daemon.playback_manager.retention_service import RetentionService

logger = logging.getLogger(__name__)


class PlaybackManager:
    """Start and manage the MetadataSyncer and RetentionService together.

    Call ``run()`` for a blocking loop that keeps the process alive
    until a SIGTERM/SIGINT is received.
    """

    def __init__(self) -> None:
        self._syncer = MetadataSyncer()
        self._retention = RetentionService()
        self._stop_event = threading.Event()

    def run(self) -> None:
        """Blocking — starts both services and waits for shutdown."""
        self._install_signal_handlers()
        self._syncer.start()
        self._retention.start()
        logger.info("PlaybackManager running")

        # Block until signalled
        self._stop_event.wait()

        self._syncer.stop()
        self._retention.stop()
        logger.info("PlaybackManager stopped")

    def stop(self) -> None:
        self._stop_event.set()

    def _install_signal_handlers(self) -> None:
        def _handler(signum, _frame):
            logger.info("Received signal %d — shutting down", signum)
            self.stop()

        signal.signal(signal.SIGTERM, _handler)
        signal.signal(signal.SIGINT, _handler)
