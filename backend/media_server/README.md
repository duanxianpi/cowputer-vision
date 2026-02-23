# Media Server

#

# FFmpeg-based dual-output HLS engine for the Cow-puter Vision system.

# Completely decoupled from Python — recording continues even if

# the AI daemon or Django app crashes.

#

# ## Quick Start

#

# Run the combined (recommended) entry point:

#

# ./start.sh

#

# Or run the feeds individually:

#

# ./live_feed.sh # low-latency live stream only

# ./archival_feed.sh # long-term recording only

#

# ## Configuration

#

# All settings are controlled via environment variables:

#

# | Variable | Default | Description |

# |-----------------|--------------------------|-----------------------------------|

# | `RTSP_URL` | `rtsp://pi:8554/test` | RTSP camera source |

# | `STORAGE_DIR` | `../storage` | Base storage directory |

# | `HLS_DIR` | `$STORAGE_DIR/hls` | Live feed output directory |

# | `REC_DIR` | `$STORAGE_DIR/rec` | Archival output directory |

# | `HLS_TIME` | `1` | Live segment duration (seconds) |

# | `HLS_LIST_SIZE` | `5` | Live playlist rolling window |

# | `REC_HLS_TIME` | `600` | Archive segment duration (seconds)|

#

# ## Outputs

#

# ### Live Feed (`$HLS_DIR/`)

# - `live.m3u8` — rolling HLS playlist

# - `seq_*.ts` — short video segments (auto-deleted)

# - Re-encoded: libx264 ultrafast + zerolatency

# - `#EXT-X-PROGRAM-DATE-TIME` tags for timestamp sync

#

# ### Archival Feed (`$REC_DIR/`)

# - `index.m3u8` — persistent HLS playlist (all segments kept)

# - `archive_YYYYMMDD_HHMMSS_NNN.ts` — 10-minute segments

# - Codec copy (no quality loss)

# - `#EXT-X-PROGRAM-DATE-TIME` tags for PlaybackManager parsing

#

# ## systemd Deployment

#

# See `media_server.service` for the systemd unit file.

#

# sudo cp media_server.service /etc/systemd/system/

# sudo systemctl daemon-reload

# sudo systemctl enable --now media_server

# journalctl -u media_server -f
