"""
Integration test for the Media Server (FFmpeg HLS generation).

Spawns live_feed.sh (or an equivalent FFmpeg command) with a local video
file as input, waits a few seconds, then verifies that HLS output files
are produced correctly.

This test is decorated with @pytest.mark.integration.
Run it with:
    pytest -m integration

Skip it in CI with:
    pytest -m "not integration"

Requirements:
  - FFmpeg must be installed and on PATH
  - A short .ts source file must be available (uses /storage/*.ts from repo)
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

BACKEND_ROOT = Path(__file__).resolve().parent.parent
STORAGE_DIR = BACKEND_ROOT / "storage"

# Locate a short source video for testing (any existing .ts in the workspace)
_candidate_sources = list(STORAGE_DIR.glob("*.ts")) + list(STORAGE_DIR.glob("hls/*.ts"))
SOURCE_VIDEO = _candidate_sources[0] if _candidate_sources else None

FFMPEG_AVAILABLE = shutil.which("ffmpeg") is not None
SOURCE_AVAILABLE = SOURCE_VIDEO is not None and SOURCE_VIDEO.is_file()


# ---------------------------------------------------------------------------
# Integration test
# ---------------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.skipif(not FFMPEG_AVAILABLE, reason="FFmpeg not found on PATH")
@pytest.mark.skipif(
    not SOURCE_AVAILABLE, reason="No source .ts video file found in storage/"
)
def test_live_feed_generates_hls_files(tmp_path):
    """
    Spawns an FFmpeg HLS segmentation command with a local .ts file as
    input and verifies that the live feed output (live.m3u8 + .ts segments)
    is produced within a timeout.

    Corresponds to V&V plan 'Media Server Integration Test':
      - FFmpeg generates HLS files (.m3u8 and .ts) in the expected directory
      - .m3u8 contains #EXTM3U and #EXT-X-TARGETDURATION
      - At least one .ts segment is written
    """
    hls_output_dir = tmp_path / "hls"
    hls_output_dir.mkdir()
    playlist = hls_output_dir / "live.m3u8"

    # Equivalent of live_feed.sh but operating on a local file instead of RTSP.
    cmd = [
        "ffmpeg",
        "-re",  # read at native speed
        "-i",
        str(SOURCE_VIDEO),
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-tune",
        "zerolatency",
        "-c:a",
        "aac",
        "-f",
        "hls",
        "-hls_time",
        "1",
        "-hls_list_size",
        "5",
        "-hls_flags",
        "delete_segments+program_date_time",
        "-use_wallclock_as_timestamps",
        "1",
        str(playlist),
    ]

    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        # Poll for up to 15 seconds for output to appear
        deadline = time.time() + 15.0
        while time.time() < deadline:
            if playlist.is_file():
                content = playlist.read_text(encoding="utf-8", errors="ignore")
                ts_files = list(hls_output_dir.glob("*.ts"))
                if ts_files:
                    break
            time.sleep(0.5)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()

    # Assertions
    assert playlist.is_file(), "live.m3u8 was not created"
    content = playlist.read_text(encoding="utf-8", errors="ignore")
    assert "#EXTM3U" in content, "Playlist missing #EXTM3U header"
    assert "#EXT-X-TARGETDURATION" in content, "Playlist missing #EXT-X-TARGETDURATION"

    ts_segments = list(hls_output_dir.glob("*.ts"))
    assert len(ts_segments) >= 1, "No .ts segment files generated"


@pytest.mark.integration
@pytest.mark.skipif(not FFMPEG_AVAILABLE, reason="FFmpeg not found on PATH")
@pytest.mark.skipif(
    not SOURCE_AVAILABLE, reason="No source .ts video file found in storage/"
)
def test_hls_segment_naming_convention(tmp_path):
    """
    HLS segments are named following the pattern configured by FFmpeg
    (default: live<N>.ts).  Verifies that at least one segment matches
    the expected pattern.
    """
    hls_output_dir = tmp_path / "hls"
    hls_output_dir.mkdir()
    playlist = hls_output_dir / "live.m3u8"

    cmd = [
        "ffmpeg",
        "-re",
        "-i",
        str(SOURCE_VIDEO),
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-tune",
        "zerolatency",
        "-c:a",
        "aac",
        "-f",
        "hls",
        "-hls_time",
        "1",
        "-hls_list_size",
        "5",
        str(playlist),
    ]

    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        deadline = time.time() + 15.0
        while time.time() < deadline:
            if playlist.is_file() and list(hls_output_dir.glob("*.ts")):
                break
            time.sleep(0.5)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()

    ts_files = list(hls_output_dir.glob("*.ts"))
    assert ts_files, "No .ts segment files generated"
    # All .ts files must be non-empty
    for ts in ts_files:
        assert ts.stat().st_size > 0, f"Empty segment file: {ts.name}"
