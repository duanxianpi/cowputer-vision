#!/bin/bash
# ===========================================================================
# Archival Feed Generator
#
# Produces an HLS playlist for long-term storage and playback.
# Segments use strftime-based filenames for human readability and
# #EXT-X-PROGRAM-DATE-TIME tags for millisecond-precision timestamps
# consumed by the PlaybackManager.
#
# Design-doc spec:
#   Format     : HLS (.m3u8 + .ts)
#   Duration   : -hls_time 600 (10-minute segments)
#   Persistence: -hls_list_size 0 (keep all in index)
#   Naming     : archive_%Y%m%d_%H%M%S.ts (strftime)
#   Timestamps : -hls_flags program_date_time
#   Output     : ${REC_DIR}/index.m3u8  +  .ts files
#
# Usage:
#   ./archival_feed.sh                          # uses defaults
#   RTSP_URL=rtsp://... REC_DIR=... ./archival_feed.sh   # override
# ===========================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration (override via environment variables)
# ---------------------------------------------------------------------------
RTSP_URL="${RTSP_URL:-rtsp://pi:8554/test}"
REC_DIR="${REC_DIR:-storage/rec}"
REC_HLS_TIME="${REC_HLS_TIME:-600}"   # 10-minute segments

mkdir -p "$REC_DIR"

echo "📼 Starting Archival Feed Generator..."
echo "   RTSP_URL    : $RTSP_URL"
echo "   REC_DIR     : $REC_DIR"
echo "   REC_HLS_TIME: ${REC_HLS_TIME}s"

exec ffmpeg -y \
    -rtsp_transport tcp \
    -use_wallclock_as_timestamps 1 \
    -i "$RTSP_URL" \
    -c:v copy \
    -c:a copy \
    -f hls \
    -hls_time "$REC_HLS_TIME" \
    -hls_list_size 0 \
    -hls_flags program_date_time+temp_file \
    -hls_segment_filename "$REC_DIR/archive_%Y%m%d_%H%M%S_%%03d.ts" \
    -strftime 1 \
    "$REC_DIR/index.m3u8"
