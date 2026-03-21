"""
MetadataSyncer — watches the recording directory for new ``.ts`` segments
and inserts/updates ``VideoSegment`` records in the database.

Uses the ``watchdog`` library for filesystem event monitoring and calls
``IndexParser`` to extract timestamps.
"""

import logging
import os
import time
from typing import Any, Optional

from watchdog.events import (
    FileSystemEventHandler,
    FileCreatedEvent,
    FileMovedEvent,
)  # pyright: ignore[reportMissingModuleSource]
from watchdog.observers import Observer  # pyright: ignore[reportMissingModuleSource]

from daemon import config
from daemon.playback_manager.index_parser import IndexParser

logger = logging.getLogger(__name__)

# Lazy import
_VideoSegment = None


def _get_model():
    global _VideoSegment
    if _VideoSegment is None:
        from api.models import VideoSegment

        _VideoSegment = VideoSegment
    return _VideoSegment


class _TsFileHandler(FileSystemEventHandler):
    """watchdog handler — fires when a new ``.ts`` file appears."""

    def __init__(self, index_path: str, rec_dir: str) -> None:
        super().__init__()
        self._index_path = index_path
        self._rec_dir = rec_dir

    def on_created(self, event: FileCreatedEvent) -> None:  # type: ignore[override]
        if event.is_directory:
            return
        src_path: str = str(event.src_path)
        if not src_path.endswith(".ts"):
            return
        logger.info("New segment detected (created): %s", src_path)
        # Small delay — FFmpeg may still be writing the file / index
        time.sleep(1)
        self._sync_segment(os.path.basename(src_path))

    def on_moved(self, event: FileMovedEvent) -> None:  # type: ignore[override]
        """Handle rename events — FFmpeg with ``-hls_flags temp_file``
        writes to a ``.tmp`` file first, then renames to ``.ts``."""
        if event.is_directory:
            return
        dest_path: str = str(event.dest_path)
        if not dest_path.endswith(".ts"):
            return
        logger.info("New segment detected (moved): %s", dest_path)
        # Small delay — FFmpeg may still be updating the index
        time.sleep(1)
        self._sync_segment(os.path.basename(dest_path))

    def _sync_segment(self, filename: str) -> None:
        """Parse the index and upsert the record for *filename*."""
        segments = IndexParser.parse(self._index_path)
        for seg in segments:
            if seg.filename == filename:
                VideoSegment = _get_model()
                VideoSegment.objects.update_or_create(
                    filename=seg.filename,
                    defaults={
                        "start_ts": seg.start_ts_ms,
                        "end_ts": seg.end_ts_ms,
                        "file_path": os.path.join(self._rec_dir, seg.filename),
                    },
                )
                logger.info(
                    "Upserted VideoSegment %s [%d → %d]",
                    seg.filename,
                    seg.start_ts_ms,
                    seg.end_ts_ms,
                )
                return

        logger.warning("Segment %s not found in index %s", filename, self._index_path)


class MetadataSyncer:
    """Start a watchdog observer on the recording directory.

    On first start, a **full sync** is performed: the entire index
    is parsed and all segments are upserted.
    """

    def __init__(
        self,
        rec_dir: Optional[str] = None,
        index_path: Optional[str] = None,
    ) -> None:
        self._rec_dir = rec_dir or config.REC_DIR
        self._index_path = index_path or config.REC_INDEX_FILE
        self._observer: Any = None

    def start(self) -> None:
        """Run the initial full sync, then begin watching."""
        os.makedirs(self._rec_dir, exist_ok=True)
        self._full_sync()

        handler = _TsFileHandler(self._index_path, self._rec_dir)
        observer = Observer()
        observer.schedule(handler, self._rec_dir, recursive=False)
        observer.start()
        self._observer = observer
        logger.info("MetadataSyncer watching %s", self._rec_dir)

    def stop(self) -> None:
        if self._observer is not None:
            self._observer.stop()
            self._observer.join()
            logger.info("MetadataSyncer stopped")

    def _full_sync(self) -> None:
        """Parse entire index and upsert all segments."""
        segments = IndexParser.parse(self._index_path)
        if not segments:
            logger.info("No segments found during full sync")
            return

        VideoSegment = _get_model()
        created = 0
        for seg in segments:
            _, was_created = VideoSegment.objects.update_or_create(
                filename=seg.filename,
                defaults={
                    "start_ts": seg.start_ts_ms,
                    "end_ts": seg.end_ts_ms,
                    "file_path": os.path.join(self._rec_dir, seg.filename),
                },
            )
            if was_created:
                created += 1

        logger.info(
            "Full sync complete: %d segments total, %d new",
            len(segments),
            created,
        )
