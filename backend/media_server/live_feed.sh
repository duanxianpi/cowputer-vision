#!/bin/bash
# ===========================================================================
# Live Feed Generator
#
# Produces a low-latency HLS stream for real-time viewing.
# Uses wallclock timestamps so the HLS tags match real-world time,
# keeping the frontend in sync with the InferenceEngine.
#
# Design-doc spec:
#   Format  : HLS (.m3u8 + .ts)
#   Latency : -hls_time 1 (1-second segments), -hls_list_size 5
#   Codec   : libx264 -preset ultrafast -tune zerolatency
#   Timestamps: -use_wallclock_as_timestamps 1
#   Output  : ${HLS_DIR}/live.m3u8  +  ${HLS_DIR}/*.ts
#
# Usage:
#   ./live_feed.sh                          # uses defaults
#   RTSP_URL=rtsp://... HLS_DIR=... ./live_feed.sh   # override
# ===========================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration (override via environment variables)
# ---------------------------------------------------------------------------
RTSP_URL="${RTSP_URL:-rtsp://pi:8554/test}"
HLS_DIR="${HLS_DIR:-storage/hls}"
HLS_TIME="${HLS_TIME:-1}"           # segment duration in seconds
HLS_LIST_SIZE="${HLS_LIST_SIZE:-5}" # number of segments in playlist

mkdir -p "$HLS_DIR"

echo "🚀 Starting Live Feed Generator..."
echo "   RTSP_URL     : $RTSP_URL"
echo "   HLS_DIR      : $HLS_DIR"
echo "   HLS_TIME     : ${HLS_TIME}s"
echo "   HLS_LIST_SIZE: $HLS_LIST_SIZE"

exec ffmpeg -y \
    -rtsp_transport tcp \
    -use_wallclock_as_timestamps 1 \
    -i "$RTSP_URL" \
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
    "$HLS_DIR/live.m3u8"
