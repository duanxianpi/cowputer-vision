"""
Unit tests for daemon/playback_manager components:
  IndexParser, MetadataSyncer, RetentionService.

V&V Coverage (per V&V plan):
  - IndexParser:
    * Parses #EXT-X-PROGRAM-DATE-TIME tag → millisecond Unix timestamp
    * Returns empty list when file does not exist
    * Handles missing tag gracefully
  - MetadataSyncer:
    * New .ts file triggers VideoSegment DB record creation
    * Duplicate file is not inserted twice (update_or_create)
  - RetentionService:
    * Deletes segments older than retention_days
    * Deletes oldest-first when disk exceeds limit
    * Does not delete recent segments
    * DB record removed alongside file
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from unittest.mock import MagicMock, call, patch

import pytest

from api.models import VideoSegment


# ---------------------------------------------------------------------------
# IndexParser tests
# ---------------------------------------------------------------------------


class TestIndexParser:
    """Tests for daemon.playback_manager.index_parser.IndexParser."""

    def test_parse_program_date_time_tag(self, tmp_path):
        """Parses #EXT-X-PROGRAM-DATE-TIME and extracts millisecond Unix timestamp."""
        from daemon.playback_manager.index_parser import IndexParser

        m3u8 = tmp_path / "index.m3u8"
        m3u8.write_text(
            "#EXTM3U\n"
            "#EXT-X-VERSION:3\n"
            "#EXT-X-TARGETDURATION:600\n"
            "#EXT-X-PROGRAM-DATE-TIME:2026-01-22T13:36:52.000Z\n"
            "#EXTINF:600.0,\n"
            "video_20260122_133652_000.ts\n",
            encoding="utf-8",
        )

        segments = IndexParser.parse(str(m3u8))

        assert len(segments) == 1
        seg = segments[0]
        assert seg.filename == "video_20260122_133652_000.ts"
        assert seg.duration_s == pytest.approx(600.0)

    def test_parse_returns_unix_ms_precision(self, tmp_path):
        """Parsed start_ts_ms is a millisecond Unix epoch integer."""
        from daemon.playback_manager.index_parser import IndexParser

        m3u8 = tmp_path / "index.m3u8"
        # 2026-01-22T13:36:52.123Z → known epoch ms
        m3u8.write_text(
            "#EXTM3U\n"
            "#EXT-X-PROGRAM-DATE-TIME:2026-01-22T13:36:52.123Z\n"
            "#EXTINF:600.0,\n"
            "seg.ts\n",
            encoding="utf-8",
        )

        segments = IndexParser.parse(str(m3u8))

        # 2026-01-22T13:36:52.123Z in epoch milliseconds
        from datetime import datetime, timezone as tz

        expected_ms = int(
            datetime(2026, 1, 22, 13, 36, 52, 123000, tzinfo=tz.utc).timestamp() * 1000
        )
        assert segments[0].start_ts_ms == expected_ms

    def test_parse_end_ts_equals_start_plus_duration(self, tmp_path):
        """end_ts_ms == start_ts_ms + duration * 1000."""
        from daemon.playback_manager.index_parser import IndexParser

        m3u8 = tmp_path / "index.m3u8"
        m3u8.write_text(
            "#EXTM3U\n"
            "#EXT-X-PROGRAM-DATE-TIME:2026-01-22T13:36:52.000Z\n"
            "#EXTINF:600.0,\n"
            "seg.ts\n",
            encoding="utf-8",
        )

        segments = IndexParser.parse(str(m3u8))
        seg = segments[0]
        assert seg.end_ts_ms == seg.start_ts_ms + 600_000

    def test_parse_missing_tag_returns_empty_list(self, tmp_path):
        """Returns empty list when no segment entries are found."""
        from daemon.playback_manager.index_parser import IndexParser

        m3u8 = tmp_path / "index.m3u8"
        m3u8.write_text("#EXTM3U\n#EXT-X-VERSION:3\n", encoding="utf-8")

        segments = IndexParser.parse(str(m3u8))
        assert segments == []

    def test_parse_nonexistent_file_returns_empty_list(self):
        """Returns empty list when file does not exist."""
        from daemon.playback_manager.index_parser import IndexParser

        segments = IndexParser.parse("/nonexistent/path/index.m3u8")
        assert segments == []

    def test_parse_multiple_segments(self, tmp_path):
        """Parses multiple segments from a playlist with multiple entries."""
        from daemon.playback_manager.index_parser import IndexParser

        m3u8 = tmp_path / "index.m3u8"
        m3u8.write_text(
            "#EXTM3U\n"
            "#EXT-X-PROGRAM-DATE-TIME:2026-01-22T13:36:52.000Z\n"
            "#EXTINF:600.0,\n"
            "seg_000.ts\n"
            "#EXT-X-PROGRAM-DATE-TIME:2026-01-22T13:46:52.000Z\n"
            "#EXTINF:600.0,\n"
            "seg_001.ts\n",
            encoding="utf-8",
        )

        segments = IndexParser.parse(str(m3u8))
        assert len(segments) == 2
        assert segments[0].filename == "seg_000.ts"
        assert segments[1].filename == "seg_001.ts"


# ---------------------------------------------------------------------------
# MetadataSyncer tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestMetadataSyncer:
    """Tests for daemon.playback_manager.metadata_syncer.MetadataSyncer."""

    def _make_syncer(self, tmp_path: Path):
        from daemon.playback_manager.metadata_syncer import MetadataSyncer

        rec_dir = str(tmp_path / "rec")
        index_path = str(tmp_path / "rec" / "index.m3u8")
        os.makedirs(rec_dir, exist_ok=True)
        return (
            MetadataSyncer(rec_dir=rec_dir, index_path=index_path),
            rec_dir,
            index_path,
        )

    def _write_m3u8_with_segment(
        self, index_path: str, segment_name: str, ts_ms: int, duration_s: float = 600.0
    ):
        from datetime import datetime, timezone as tz

        dt = datetime.fromtimestamp(ts_ms / 1000.0, tz=tz.utc)
        dt_str = dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        Path(index_path).write_text(
            f"#EXTM3U\n"
            f"#EXT-X-PROGRAM-DATE-TIME:{dt_str}\n"
            f"#EXTINF:{duration_s},\n"
            f"{segment_name}\n",
            encoding="utf-8",
        )

    def test_new_ts_file_creates_video_segment_record(self, tmp_path):
        """_SegmentFileHandler._sync_segment() creates a VideoSegment DB row."""
        from daemon.playback_manager.metadata_syncer import _SegmentFileHandler

        rec_dir = str(tmp_path / "rec")
        os.makedirs(rec_dir, exist_ok=True)
        index_path = str(tmp_path / "rec" / "index.m3u8")

        ts_ms = 1769124000000
        seg_name = "video_20260122_133652_000.ts"
        self._write_m3u8_with_segment(index_path, seg_name, ts_ms)

        # Create the physical .ts file
        ts_file = Path(rec_dir) / seg_name
        ts_file.write_bytes(b"fake-ts-content")

        handler = _SegmentFileHandler(index_path=index_path, rec_dir=rec_dir)

        # Patch remux to avoid calling real FFmpeg
        with patch(
            "daemon.playback_manager.metadata_syncer._remux_to_mp4", return_value=None
        ):
            handler._sync_segment(seg_name)

        # The original .ts should be registered (remux returned None → fallback)
        assert VideoSegment.objects.filter(filename=seg_name).exists()
        seg = VideoSegment.objects.get(filename=seg_name)
        assert seg.start_ts == ts_ms

    def test_duplicate_file_not_inserted_twice(self, tmp_path):
        """_sync_segment() does not create a second row for the same filename."""
        from daemon.playback_manager.metadata_syncer import _SegmentFileHandler

        rec_dir = str(tmp_path / "rec")
        os.makedirs(rec_dir, exist_ok=True)
        index_path = str(tmp_path / "rec" / "index.m3u8")

        ts_ms = 1769124000000
        seg_name = "video_20260122_133652_000.ts"
        self._write_m3u8_with_segment(index_path, seg_name, ts_ms)

        ts_file = Path(rec_dir) / seg_name
        ts_file.write_bytes(b"fake-ts-content")

        handler = _SegmentFileHandler(index_path=index_path, rec_dir=rec_dir)

        with patch(
            "daemon.playback_manager.metadata_syncer._remux_to_mp4", return_value=None
        ):
            handler._sync_segment(seg_name)
            handler._sync_segment(seg_name)  # call again

        assert VideoSegment.objects.filter(filename=seg_name).count() == 1


# ---------------------------------------------------------------------------
# RetentionService tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRetentionService:
    """Tests for daemon.playback_manager.retention_service.RetentionService."""

    def _make_service(self, tmp_path: Path, check_interval: int = 1):
        from daemon.playback_manager.retention_service import RetentionService

        rec_dir = str(tmp_path / "rec")
        os.makedirs(rec_dir, exist_ok=True)
        svc = RetentionService(rec_dir=rec_dir, check_interval=check_interval)
        svc._get_retention_days = lambda: 30  # 30-day default
        svc._get_retention_max_disk_gb = lambda: 100.0  # 100 GB default
        return svc, rec_dir

    def _make_old_segment(
        self, rec_dir: str, filename: str, age_days: int, db: bool = True
    ):
        """Create a VideoSegment record and dummy file `age_days` days old."""
        now_ms = int(time.time() * 1000)
        start_ts = now_ms - age_days * 86400 * 1000
        file_path = os.path.join(rec_dir, filename)
        Path(file_path).write_bytes(b"fake")

        if db:
            VideoSegment.objects.create(
                filename=filename,
                start_ts=start_ts,
                end_ts=start_ts + 600_000,
                file_path=file_path,
            )
        return file_path

    def test_deletes_segments_older_than_retention_days(self, tmp_path):
        """_cleanup_by_age() deletes VideoSegment rows and files older than threshold."""
        svc, rec_dir = self._make_service(tmp_path)

        old_path = self._make_old_segment(rec_dir, "old_seg.mp4", age_days=60)

        svc._cleanup_by_age()

        assert not VideoSegment.objects.filter(filename="old_seg.mp4").exists()
        assert not os.path.isfile(old_path)

    def test_does_not_delete_recent_segments(self, tmp_path):
        """_cleanup_by_age() leaves recent segments untouched."""
        svc, rec_dir = self._make_service(tmp_path)

        recent_path = self._make_old_segment(rec_dir, "recent_seg.mp4", age_days=5)

        svc._cleanup_by_age()

        assert VideoSegment.objects.filter(filename="recent_seg.mp4").exists()
        assert os.path.isfile(recent_path)

    def test_db_record_removed_with_file(self, tmp_path):
        """_cleanup_by_age() removes the DB row when the file is deleted."""
        svc, rec_dir = self._make_service(tmp_path)

        self._make_old_segment(rec_dir, "old_seg.mp4", age_days=45)

        svc._cleanup_by_age()

        assert VideoSegment.objects.filter(filename="old_seg.mp4").count() == 0

    def test_deletes_oldest_when_disk_exceeds_limit(self, tmp_path):
        """_cleanup_by_disk() removes oldest-first when usage exceeds limit."""
        svc, rec_dir = self._make_service(tmp_path)
        svc._get_retention_max_disk_gb = lambda: 0.0  # Everything exceeds limit

        old_path = self._make_old_segment(rec_dir, "oldest.mp4", age_days=10)
        new_path = self._make_old_segment(rec_dir, "newer.mp4", age_days=2)

        # Mock disk usage so that it starts "over limit" and drops after deletion
        call_count = {"n": 0}

        def mock_dir_size(directory):
            call_count["n"] += 1
            # Returns >0 on first call, 0 on subsequent
            return 1.0 if call_count["n"] <= 1 else 0.0

        svc._dir_size_gb = mock_dir_size

        with patch.object(svc, "_cleanup_orphaned_files"):
            svc._cleanup_by_disk()

        # Oldest segment should have been removed first
        assert not VideoSegment.objects.filter(filename="oldest.mp4").exists()
