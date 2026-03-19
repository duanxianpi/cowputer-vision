"""
BehaviorClassifier — runs YOLO inference and extracts detections with
optional behavior labels.

Wraps ``ultralytics.YOLO`` and converts raw results into a list of
``Detection`` dataclass instances ready for the ``DatabaseHandler``.
"""

import logging
from dataclasses import dataclass
from typing import List

import numpy as np
from ultralytics import YOLO

from daemon import config

logger = logging.getLogger(__name__)


@dataclass
class Detection:
    """Single detected cow in one frame."""

    track_id: int
    bbox: List[float]  # [x, y, w, h]  (top-left origin)
    behavior: str = "unknown"
    confidence: float = 0.0
    timestamp: float = 0.0  # epoch seconds when the frame was captured


class BehaviorClassifier:
    """Load a YOLO model and run ``model.track()`` on frames.

    Parameters
    ----------
    model_path : str | None
        Path to the YOLO weights file.  Falls back to ``config.MODEL_PATH``.
    """

    def __init__(self, model_path: str | None = None) -> None:
        path = model_path or config.MODEL_PATH
        logger.info("Loading YOLO model from %s", path)
        self._model = YOLO(path)
        self._conf = config.CONFIDENCE_THRESHOLD
        self._classes = config.DETECTION_CLASSES
        self._min_area = config.MIN_BBOX_AREA
        self._detection_only = config.DETECTION_ONLY_MODE
        self._behavior_map = config.BEHAVIOR_MAP

    def update_runtime_config(
        self,
        *,
        confidence_threshold: float,
        detection_classes: list[int],
        min_bbox_area: int,
    ) -> None:
        """Apply runtime-configurable inference settings."""
        self._conf = confidence_threshold
        self._classes = detection_classes
        self._min_area = min_bbox_area

    def classify(self, frame: np.ndarray) -> List[Detection]:
        """Run tracking inference on *frame* and return detections.

        Parameters
        ----------
        frame : np.ndarray
            BGR image (OpenCV format).

        Returns
        -------
        list[Detection]
            Filtered list of cow detections with bounding boxes and
            (optionally) behavior labels.
        """
        results = self._model.track(  # pyright: ignore[reportAttributeAccessIssue]
            frame,
            persist=True,
            verbose=False,
            conf=self._conf,
            classes=self._classes,
        )

        detections: List[Detection] = []

        for r in results:
            if r.boxes.id is None:
                continue

            boxes = r.boxes.xywh.cpu().numpy()  # centre-x, centre-y, w, h
            track_ids = r.boxes.id.int().cpu().tolist()
            confidences = r.boxes.conf.cpu().tolist()

            # If the model has class predictions, use them for behavior
            cls_ids = (
                r.boxes.cls.int().cpu().tolist() if r.boxes.cls is not None else []
            )

            for idx, (box, track_id) in enumerate(zip(boxes, track_ids)):
                x_c, y_c, w, h = box

                # Skip tiny detections
                if w * h < self._min_area:
                    continue

                # Convert to [x, y, w, h] (top-left origin)
                bbox = [
                    round(float(x_c - w / 2), 1),
                    round(float(y_c - h / 2), 1),
                    round(float(w), 1),
                    round(float(h), 1),
                ]

                # Determine behavior label
                if self._detection_only or not cls_ids:
                    behavior = "unknown"
                else:
                    cls_id = cls_ids[idx]
                    behavior = self._behavior_map.get(cls_id, "unknown")

                confidence = confidences[idx] if idx < len(confidences) else 0.0

                detections.append(
                    Detection(
                        track_id=int(track_id),
                        bbox=bbox,
                        behavior=behavior,
                        confidence=round(float(confidence), 4),
                    )
                )

        return detections
