#!/bin/bash
# ===========================================================================
# Media Server — Combined Entry Point
#
# Runs a single FFmpeg process with dual HLS output:
#   1. Live feed  — low-latency, re-encoded, short segments
#   2. Archival   — codec copy, long segments, persistent index
#
# This is more efficient than running two separate FFmpeg processes
# because the RTSP stream is decoded only once.
#
# The Media Server is completely decoupled from Python to ensure
# recording continues even if the AI daemon or Django app crashes.
#
# Usage:
#   ./start.sh                              # uses defaults
#   RTSP_URL=rtsp://... ./start.sh          # override RTSP source
#
# To run as a systemd service, see media_server.service
# ===========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---------------------------------------------------------------------------
# Configuration (override via environment variables)
# ---------------------------------------------------------------------------
RTSP_URL="${RTSP_URL:-rtsp://pi:8554/test}"
STORAGE_DIR="${STORAGE_DIR:-$PROJECT_ROOT/storage}"
HLS_DIR="${HLS_DIR:-$STORAGE_DIR/hls}"
REC_DIR="${REC_DIR:-$STORAGE_DIR/rec}"

# Live feed tuning
HLS_TIME="${HLS_TIME:-1}"              # segment duration (seconds)
HLS_LIST_SIZE="${HLS_LIST_SIZE:-5}"    # rolling window size

# Archival tuning
REC_HLS_TIME="${REC_HLS_TIME:-600}"    # segment duration (seconds, 10 min)

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
mkdir -p "$HLS_DIR" "$REC_DIR"

echo "============================================================"
echo "  Media Server — Dual-Output HLS Engine"
echo "============================================================"
echo "  RTSP_URL      : $RTSP_URL"
echo "  HLS_DIR       : $HLS_DIR  (live)"
echo "  REC_DIR       : $REC_DIR  (archive)"
echo "  HLS_TIME      : ${HLS_TIME}s"
echo "  HLS_LIST_SIZE : $HLS_LIST_SIZE"
echo "  REC_HLS_TIME  : ${REC_HLS_TIME}s"
echo "============================================================"

# ---------------------------------------------------------------------------
# Graceful shutdown — forward signals to FFmpeg
# ---------------------------------------------------------------------------
cleanup() {
    echo "⏹  Shutting down Media Server..."
    kill -- -$$ 2>/dev/null || true
}
trap cleanup SIGTERM SIGINT

# ---------------------------------------------------------------------------
# FFmpeg — single process, dual output
#
# Output 1 (Live):
#   - Re-encode with libx264 ultrafast + zerolatency
#   - Short segments for low latency
#   - Rolling playlist (delete old segments)
#   - program_date_time for timestamp sync with InferenceEngine
#
# Output 2 (Archival):
#   - Codec copy (no re-encode, preserves quality)
#   - Long segments (10 min default)
#   - Persistent playlist (hls_list_size 0 = keep all)
#   - program_date_time for PlaybackManager timestamp parsing
#   - strftime naming for human-readable filenames
# ---------------------------------------------------------------------------
exec ffmpeg -y \
    -rtsp_transport tcp \
    -use_wallclock_as_timestamps 1 \
    -i "$RTSP_URL" \
    \
    -c:v libx264 \
    -preset ultrafast \
    -tune zerolatency \
    -g 25 \
    -sc_threshold 0 \
    -c:a aac \
    -b:a 128k \
    -f hls \
    -hls_time "$HLS_TIME" \
    -hls_list_size "$HLS_LIST_SIZE" \
    -hls_flags delete_segments+program_date_time \
    -hls_segment_filename "$HLS_DIR/seq_%03d.ts" \
    "$HLS_DIR/live.m3u8" \
    \
    -c:v copy \
    -c:a copy \
    -f hls \
    -hls_time "$REC_HLS_TIME" \
    -hls_list_size 0 \
    -hls_flags program_date_time+temp_file \
    -hls_segment_filename "$REC_DIR/archive_%Y%m%d_%H%M%S_%%03d.ts" \
    -strftime 1 \
    "$REC_DIR/index.m3u8"
