"""
IndexParser — reads an HLS ``index.m3u8`` playlist and extracts
per-segment timing information from ``#EXT-X-PROGRAM-DATE-TIME`` tags.
"""

import logging
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Optional

logger = logging.getLogger(__name__)

# Regex for the ISO-8601 date-time in the tag
_DATE_RE = re.compile(
    r"#EXT-X-PROGRAM-DATE-TIME:(.+)"
)
_EXTINF_RE = re.compile(
    r"#EXTINF:([\d.]+)"
)


@dataclass
class SegmentInfo:
    """Metadata for a single ``.ts`` HLS segment."""

    filename: str
    start_ts_ms: int    # millisecond Unix epoch
    duration_s: float
    end_ts_ms: int      # start + duration


class IndexParser:
    """Parse an HLS ``.m3u8`` playlist produced by FFmpeg's archival feed.

    The parser specifically looks for ``#EXT-X-PROGRAM-DATE-TIME`` tags
    to obtain millisecond-precision wall-clock start times (injected by
    FFmpeg via ``-hls_flags program_date_time``).
    """

    @staticmethod
    def parse(m3u8_path: str) -> List[SegmentInfo]:
        """Parse the given ``.m3u8`` file and return segment metadata.

        If the file does not exist or cannot be read the method returns
        an empty list and logs a warning.
        """
        if not os.path.isfile(m3u8_path):
            logger.warning("Playlist not found: %s", m3u8_path)
            return []

        segments: List[SegmentInfo] = []
        current_date: Optional[int] = None   # ms epoch
        current_duration: Optional[float] = None

        try:
            with open(m3u8_path, "r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()

                    # #EXT-X-PROGRAM-DATE-TIME:2026-02-23T00:00:00.000Z
                    m = _DATE_RE.match(line)
                    if m:
                        dt_str = m.group(1).strip()
                        current_date = _parse_iso8601_ms(dt_str)
                        continue

                    # #EXTINF:600.0,
                    m = _EXTINF_RE.match(line)
                    if m:
                        current_duration = float(m.group(1))
                        continue

                    # .ts filename line
                    if line and not line.startswith("#"):
                        if current_date is not None and current_duration is not None:
                            segments.append(
                                SegmentInfo(
                                    filename=line,
                                    start_ts_ms=current_date,
                                    duration_s=current_duration,
                                    end_ts_ms=current_date + int(current_duration * 1000),
                                )
                            )
                        elif current_duration is not None and segments:
                            # No date-time tag: estimate from previous segment
                            prev = segments[-1]
                            est_start = prev.end_ts_ms
                            segments.append(
                                SegmentInfo(
                                    filename=line,
                                    start_ts_ms=est_start,
                                    duration_s=current_duration,
                                    end_ts_ms=est_start + int(current_duration * 1000),
                                )
                            )
                        # Reset for next segment
                        current_date = None
                        current_duration = None

        except Exception as exc:
            logger.error("Failed to parse %s: %s", m3u8_path, exc)

        logger.debug("Parsed %d segments from %s", len(segments), m3u8_path)
        return segments


def _parse_iso8601_ms(dt_str: str) -> int:
    """Convert an ISO-8601 date-time string to millisecond Unix epoch.

    Handles both ``Z`` and ``+00:00`` suffixes, and optional
    fractional seconds.
    """
    # Normalise timezone representation
    dt_str = dt_str.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(dt_str)
    except ValueError:
        # Fallback: try strptime for more exotic formats
        dt = datetime.strptime(dt_str, "%Y-%m-%dT%H:%M:%S.%f%z")

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return int(dt.timestamp() * 1000)
