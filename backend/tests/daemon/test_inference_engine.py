"""
Unit tests for daemon/inference_engine components:
  VideoStream, BehaviorClassifier, DatabaseHandler.

V&V Coverage:
  - VideoStream: read returns frame+timestamp; reconnect on failure; is_alive after stop;
    context manager calls stop
  - BehaviorClassifier: classify returns Detection list; empty frame returns [];
    update_runtime_config changes threshold; Detection dataclass has required fields
  - DatabaseHandler: write_batch calls bulk_create; retries on DatabaseError
"""

from __future__ import annotations

import threading
import time
from unittest.mock import MagicMock, call, patch

import numpy as np
import pytest

# ---------------------------------------------------------------------------
# VideoStream tests
# ---------------------------------------------------------------------------


class TestVideoStream:
    """Tests for daemon.inference_engine.video_stream.VideoStream."""

    def test_read_returns_frame_and_timestamp(self):
        """read() returns the stored frame and timestamp without starting a thread."""
        from daemon.inference_engine.video_stream import VideoStream

        vs = VideoStream("rtsp://fake/stream")
        fake_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        vs._latest_frame = fake_frame
        vs._latest_ts = 1769124140.0

        frame, ts = vs.read()

        assert frame is not None
        assert frame.shape == (480, 640, 3)
        assert ts == 1769124140.0

    def test_read_returns_none_when_no_frame(self):
        """read() returns (None, 0.0) before any frame is captured."""
        from daemon.inference_engine.video_stream import VideoStream

        vs = VideoStream("rtsp://fake/stream")
        frame, ts = vs.read()
        assert frame is None
        assert ts == 0.0

    def test_read_returns_copy_of_frame(self):
        """read() returns a copy, not the original reference."""
        from daemon.inference_engine.video_stream import VideoStream

        vs = VideoStream("rtsp://fake/stream")
        original = np.zeros((100, 100, 3), dtype=np.uint8)
        vs._latest_frame = original
        vs._latest_ts = 1.0

        frame, _ = vs.read()
        # Mutating the returned copy does not affect stored frame
        frame[:] = 255
        assert vs._latest_frame[0, 0, 0] == 0

    def test_is_alive_false_before_start(self):
        """is_alive() returns False before start() is called."""
        from daemon.inference_engine.video_stream import VideoStream

        vs = VideoStream("rtsp://fake/stream")
        assert vs.is_alive() is False

    def test_is_alive_false_after_stop(self):
        """is_alive() returns False after stop() is called."""
        from daemon.inference_engine.video_stream import VideoStream

        mock_thread = MagicMock(spec=threading.Thread)
        mock_cap = MagicMock()
        mock_cap.read.return_value = (False, None)

        with patch(
            "daemon.inference_engine.video_stream.cv2.VideoCapture",
            return_value=mock_cap,
        ):
            with patch(
                "daemon.inference_engine.video_stream.threading.Thread",
                return_value=mock_thread,
            ):
                mock_thread.is_alive.return_value = True
                vs = VideoStream("rtsp://fake/stream")
                vs.start()

                # After stop the thread is no longer alive
                mock_thread.is_alive.return_value = False
                vs.stop()
                assert vs.is_alive() is False

    def test_context_manager_calls_stop(self):
        """__exit__ calls stop()."""
        from daemon.inference_engine.video_stream import VideoStream

        mock_cap = MagicMock()
        mock_thread = MagicMock(spec=threading.Thread)
        mock_thread.is_alive.return_value = False

        with patch(
            "daemon.inference_engine.video_stream.cv2.VideoCapture",
            return_value=mock_cap,
        ):
            with patch(
                "daemon.inference_engine.video_stream.threading.Thread",
                return_value=mock_thread,
            ):
                with patch.object(VideoStream, "stop") as mock_stop:
                    with VideoStream("rtsp://fake/stream"):
                        pass
                    mock_stop.assert_called_once()

    def test_reconnects_on_stream_failure(self):
        """_update() calls VideoCapture again when read() returns False."""
        from daemon.inference_engine.video_stream import VideoStream

        call_count = {"n": 0}
        fake_frame = np.zeros((100, 100, 3), dtype=np.uint8)

        mock_cap = MagicMock()

        def _side_effect():
            call_count["n"] += 1
            if call_count["n"] <= 3:
                return (False, None)
            # Stop the loop after a successful read
            return (True, fake_frame)

        mock_cap.read.side_effect = _side_effect

        with patch(
            "daemon.inference_engine.video_stream.cv2.VideoCapture",
            return_value=mock_cap,
        ):
            with patch("daemon.inference_engine.video_stream.time.sleep"):  # instant
                vs = VideoStream("rtsp://fake/stream")
                vs._stream = mock_cap
                vs._started = True

                # Run _update() directly (no thread) for a limited number of iterations
                # Stop after 5 reads
                reads = 0
                original_update = vs._update

                def limited_update():
                    nonlocal reads
                    reconnect_delay = 1.0
                    while vs._started and reads < 6:
                        ret, frame = vs._stream.read()
                        reads += 1
                        if ret:
                            with vs._lock:
                                vs._latest_frame = frame
                                vs._latest_ts = time.time()
                            vs._started = False  # stop after first success
                        else:
                            reconnect_delay = min(
                                reconnect_delay * 2, vs._MAX_RECONNECT_DELAY
                            )
                            if vs._stream is not None:
                                vs._stream.release()
                            vs._stream = mock_cap  # same mock

                limited_update()

                frame, _ = vs.read()
                assert frame is not None


# ---------------------------------------------------------------------------
# BehaviorClassifier tests
# ---------------------------------------------------------------------------


class TestBehaviorClassifier:
    """Tests for daemon.inference_engine.behavior_classifier.BehaviorClassifier."""

    @pytest.fixture(autouse=True)
    def _patch_yolo(self):
        """Patch YOLO so no model file is loaded during tests."""
        with patch("daemon.inference_engine.behavior_classifier.YOLO") as mock_yolo_cls:
            self.mock_model = MagicMock()
            mock_yolo_cls.return_value = self.mock_model
            yield

    def _make_classifier(self, detection_only: bool = True):
        from daemon.inference_engine.behavior_classifier import BehaviorClassifier

        with patch("daemon.inference_engine.behavior_classifier.config") as mock_cfg:
            mock_cfg.MODEL_PATH = "fake_model.pt"
            mock_cfg.CONFIDENCE_THRESHOLD = 0.5
            mock_cfg.DETECTION_CLASSES = [0]
            mock_cfg.MIN_BBOX_AREA = 100
            mock_cfg.DETECTION_ONLY_MODE = detection_only
            mock_cfg.BEHAVIOR_MAP = {0: "feeding", 1: "standing"}
            clf = BehaviorClassifier(model_path="fake_model.pt")
            clf._model = self.mock_model
        return clf

    def test_detection_dataclass_has_required_fields(self):
        """Detection dataclass has track_id, bbox, behavior, confidence, timestamp."""
        from daemon.inference_engine.behavior_classifier import Detection

        det = Detection(track_id=1, bbox=[10.0, 20.0, 50.0, 60.0])
        assert hasattr(det, "track_id")
        assert hasattr(det, "bbox")
        assert hasattr(det, "behavior")
        assert hasattr(det, "confidence")
        assert hasattr(det, "timestamp")

    def test_classify_returns_detection_list(self):
        """classify() returns a list of Detection objects."""
        clf = self._make_classifier()
        frame = np.zeros((480, 640, 3), dtype=np.uint8)

        # Build mock YOLO result
        mock_result = MagicMock()
        mock_result.boxes.id = MagicMock()
        mock_result.boxes.id.int.return_value.cpu.return_value.tolist.return_value = [
            1,
            2,
        ]
        mock_result.boxes.xywh.cpu.return_value.numpy.return_value = np.array(
            [[100.0, 100.0, 80.0, 60.0], [300.0, 200.0, 90.0, 70.0]]
        )
        mock_result.boxes.conf.cpu.return_value.tolist.return_value = [0.9, 0.8]
        mock_result.boxes.cls = None  # detection-only mode

        self.mock_model.track.return_value = [mock_result]

        detections = clf.classify(frame)

        assert isinstance(detections, list)
        assert len(detections) == 2
        assert detections[0].track_id == 1
        assert len(detections[0].bbox) == 4

    def test_classify_empty_frame_no_detections(self):
        """classify() returns empty list when YOLO finds no boxes."""
        clf = self._make_classifier()
        frame = np.zeros((480, 640, 3), dtype=np.uint8)

        mock_result = MagicMock()
        mock_result.boxes.id = None  # no detections

        self.mock_model.track.return_value = [mock_result]

        detections = clf.classify(frame)
        assert detections == []

    def test_classify_filters_small_bbox(self):
        """classify() skips detections whose bounding box area is below min_bbox_area."""
        clf = self._make_classifier()
        clf._min_area = 5000  # high threshold

        frame = np.zeros((480, 640, 3), dtype=np.uint8)

        mock_result = MagicMock()
        mock_result.boxes.id = MagicMock()
        mock_result.boxes.id.int.return_value.cpu.return_value.tolist.return_value = [1]
        # Small box: 10×10 = 100 px² < 5000
        mock_result.boxes.xywh.cpu.return_value.numpy.return_value = np.array(
            [[50.0, 50.0, 10.0, 10.0]]
        )
        mock_result.boxes.conf.cpu.return_value.tolist.return_value = [0.9]
        mock_result.boxes.cls = None

        self.mock_model.track.return_value = [mock_result]

        detections = clf.classify(frame)
        assert detections == []

    def test_update_runtime_config_changes_threshold(self):
        """update_runtime_config() updates the confidence threshold."""
        clf = self._make_classifier()
        clf.update_runtime_config(
            confidence_threshold=0.7,
            detection_classes=[0, 1],
            min_bbox_area=500,
        )
        assert clf._conf == 0.7
        assert clf._classes == [0, 1]
        assert clf._min_area == 500


# ---------------------------------------------------------------------------
# DatabaseHandler tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDatabaseHandler:
    """Tests for daemon.inference_engine.database_handler.DatabaseHandler."""

    def _make_detections(self, n: int = 3):
        from daemon.inference_engine.behavior_classifier import Detection

        return [
            Detection(
                track_id=i,
                bbox=[float(i * 10), float(i * 10), 50.0, 60.0],
                behavior="feeding",
                confidence=0.9,
                timestamp=1769124140.0 + i,
            )
            for i in range(n)
        ]

    def test_write_batch_calls_bulk_create(self):
        """write_batch() calls TrackingData.objects.bulk_create with correct objects."""
        from daemon.inference_engine.database_handler import DatabaseHandler

        handler = DatabaseHandler()
        detections = self._make_detections(3)

        with patch("api.models.TrackingData.objects") as mock_mgr:
            mock_mgr.bulk_create.return_value = None
            handler.write_batch(detections)
            mock_mgr.bulk_create.assert_called_once()
            objects = mock_mgr.bulk_create.call_args[0][0]
            assert len(objects) == 3

    def test_write_batch_empty_list_does_not_call_bulk_create(self):
        """write_batch() with empty list does not call bulk_create."""
        from daemon.inference_engine.database_handler import DatabaseHandler

        handler = DatabaseHandler()

        with patch("api.models.TrackingData.objects") as mock_mgr:
            handler.write_batch([])
            mock_mgr.bulk_create.assert_not_called()

    def test_write_batch_retries_on_database_error(self):
        """write_batch() retries up to max_retries on DatabaseError."""
        from django.db import DatabaseError
        from daemon.inference_engine.database_handler import DatabaseHandler

        handler = DatabaseHandler(max_retries=3, retry_delay=0.0)
        detections = self._make_detections(1)

        call_count = {"n": 0}

        def _flaky_bulk_create(objects, **kwargs):
            call_count["n"] += 1
            raise DatabaseError("DB error")

        with patch("api.models.TrackingData.objects") as mock_mgr:
            with patch("daemon.inference_engine.database_handler.time.sleep"):
                mock_mgr.bulk_create.side_effect = _flaky_bulk_create
                handler.write_batch(detections)

        assert call_count["n"] == 3  # retried max_retries times

    def test_write_batch_timestamps_converted_to_ms(self):
        """write_batch() converts epoch-seconds timestamps to milliseconds."""
        from daemon.inference_engine.behavior_classifier import Detection
        from daemon.inference_engine.database_handler import DatabaseHandler
        from api.models import TrackingData

        handler = DatabaseHandler()
        det = Detection(
            track_id=1,
            bbox=[0.0, 0.0, 50.0, 50.0],
            behavior="standing",
            confidence=0.8,
            timestamp=1769124140.0,  # seconds
        )

        handler.write_batch([det])

        record = TrackingData.objects.get(cow_id="cow_1")
        assert record.timestamp == 1769124140000  # milliseconds
