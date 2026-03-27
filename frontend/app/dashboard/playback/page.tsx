"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { RefreshCw, Play, Pause, RotateCcw, Rewind, FastForward, Maximize } from "lucide-react";
import CPPageHeader from "@/components/CPPageHeader";
import CPButton from "@/components/CPButton";
import { usePlaybackSegments } from "@/hooks/playback";
import { playbackService, VideoSegment } from "@/services/playback";
import { trackService, TrackingData } from "@/services/track";
import { getBehaviorHex } from "@/constants/behaviorColors";
import { BEHAVIOR_LABELS } from "@/constants/behaviorColors";

const SPEEDS = [1, 2, 4, 8] as const;
const BBOX_TIME_OFFSET_MS = 5300;
const MAX_GAP_MS = 3000;
const PRELOAD_BEFORE_MS = 5000;
const PRELOAD_AFTER_MS = 15000;
const BUCKET_SIZE_MS = 5000;

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString();
}

function formatVideoTime(seconds: number) {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpolateBox(prevBox: number[], nextBox: number[], t: number): number[] {
  return prevBox.map((v, i) => lerp(v, nextBox[i], t));
}

function formatBehaviorLabel(behavior?: string) {
  if (!behavior) return "";
  return BEHAVIOR_LABELS[behavior] ?? behavior;
}

export default function PlaybackPage() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const [selectedSegment, setSelectedSegment] = useState<VideoSegment | null>(null);
  const [tracks, setTracks] = useState<TrackingData[]>([]);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const loadedTrackWindowsRef = useRef<Array<{ start: number; end: number }>>([]);
  const loadingTrackWindowRef = useRef(false);

  const { data: segments = [], isLoading: loadingSegments, isError, error, refetch } = usePlaybackSegments(selectedDate);

  // Auto-select first segment when segments load
  useEffect(() => {
    if (segments.length > 0 && !selectedSegment) {
      setSelectedSegment(segments[0]);
    } else if (segments.length === 0) {
      setSelectedSegment(null);
    }
  }, [segments, selectedSegment]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [videoSrc]);

  // Get signed streaming URL when segment changes
  useEffect(() => {
    if (!selectedSegment) {
      setVideoSrc(null);
      setVideoError("");
      setTracks([]);
      loadedTrackWindowsRef.current = [];
      return;
    }

    let cancelled = false;
    setTracks([]);
    loadedTrackWindowsRef.current = [];
    setLoadingVideo(true);
    setVideoError("");

    playbackService
      .fetchStreamUrl(selectedSegment)
      .then((url) => {
        if (!cancelled) setVideoSrc(url);
      })
      .catch((err) => {
        if (!cancelled) setVideoError(err instanceof Error ? err.message : "Failed to load video.");
      })
      .finally(() => {
        if (!cancelled) setLoadingVideo(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSegment]);

  // Track windowed loading helpers
  const isWindowLoaded = useCallback((start: number, end: number) => {
    return loadedTrackWindowsRef.current.some((w) => start >= w.start && end <= w.end);
  }, []);

  const mergeLoadedWindow = useCallback((start: number, end: number) => {
    const windows = [...loadedTrackWindowsRef.current, { start, end }];
    windows.sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [];
    for (const w of windows) {
      const last = merged[merged.length - 1];
      if (!last || w.start > last.end + 1) {
        merged.push({ ...w });
      } else {
        last.end = Math.max(last.end, w.end);
      }
    }
    loadedTrackWindowsRef.current = merged;
  }, []);

  const loadTracksForWindow = useCallback(async (windowStart: number, windowEnd: number) => {
    if (loadingTrackWindowRef.current || isWindowLoaded(windowStart, windowEnd)) return;

    loadingTrackWindowRef.current = true;
    try {
      const data = await trackService.fetchTracksWindow(windowStart, windowEnd);
      setTracks((prev) => {
        const map = new Map<string, TrackingData>();
        for (const item of prev) map.set(`${item.cow_id}_${item.timestamp}_${item.behavior}`, item);
        for (const item of data) map.set(`${item.cow_id}_${item.timestamp}_${item.behavior}`, item);
        return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
      });
      mergeLoadedWindow(windowStart, windowEnd);
    } catch (err) {
      console.error("loadTracksForWindow error:", err);
    } finally {
      loadingTrackWindowRef.current = false;
    }
  }, [isWindowLoaded, mergeLoadedWindow]);

  // Preload tracks as video plays
  useEffect(() => {
    const video = videoRef.current;
    const segment = selectedSegment;
    if (!video || !segment) return;

    let lastRequestedBucket = -1;

    const checkAndLoad = () => {
      const currentAbsTs = segment.start_ts + video.currentTime * 1000;
      const bucket = Math.floor(currentAbsTs / BUCKET_SIZE_MS);
      if (bucket === lastRequestedBucket) return;
      lastRequestedBucket = bucket;

      const windowStart = Math.max(segment.start_ts, currentAbsTs - PRELOAD_BEFORE_MS);
      const windowEnd = Math.min(segment.end_ts, currentAbsTs + PRELOAD_AFTER_MS);
      loadTracksForWindow(windowStart, windowEnd);
    };

    video.addEventListener("timeupdate", checkAndLoad);
    video.addEventListener("seeked", checkAndLoad);
    video.addEventListener("loadeddata", checkAndLoad);
    checkAndLoad();

    return () => {
      video.removeEventListener("timeupdate", checkAndLoad);
      video.removeEventListener("seeked", checkAndLoad);
      video.removeEventListener("loadeddata", checkAndLoad);
    };
  }, [selectedSegment, videoSrc, loadTracksForWindow]);

  // Canvas bbox drawing
  const drawTracks = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const segment = selectedSegment;
    if (!video || !canvas || !segment) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = (wrapperRef.current ?? video).getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentAbsTs = segment.start_ts + video.currentTime * 1000 + BBOX_TIME_OFFSET_MS;

    // Group tracks by cow
    const grouped = new Map<string, TrackingData[]>();
    for (const item of tracks) {
      const bbox = item.bbox as number[];
      if (!Array.isArray(bbox) || bbox.length < 4) continue;
      if (!grouped.has(item.cow_id)) grouped.set(item.cow_id, []);
      grouped.get(item.cow_id)!.push(item);
    }

    // Find interpolated position per cow
    const currentTracks: TrackingData[] = [];
    for (const [, cowTracks] of grouped) {
      cowTracks.sort((a, b) => a.timestamp - b.timestamp);

      let prev: TrackingData | null = null;
      let next: TrackingData | null = null;
      for (const track of cowTracks) {
        if (track.timestamp <= currentAbsTs) prev = track;
        if (track.timestamp >= currentAbsTs) { next = track; break; }
      }

      if (prev && next) {
        const prevDiff = currentAbsTs - prev.timestamp;
        const nextDiff = next.timestamp - currentAbsTs;
        if (prevDiff <= MAX_GAP_MS && nextDiff <= MAX_GAP_MS) {
          if (prev.timestamp === next.timestamp) {
            currentTracks.push(prev);
          } else {
            const t = (currentAbsTs - prev.timestamp) / (next.timestamp - prev.timestamp);
            currentTracks.push({
              ...prev,
              bbox: interpolateBox(
                (prev.bbox as number[]).map(Number),
                (next.bbox as number[]).map(Number),
                t
              ),
              timestamp: currentAbsTs,
            });
          }
        }
      } else if (prev && currentAbsTs - prev.timestamp <= MAX_GAP_MS) {
        currentTracks.push(prev);
      } else if (next && next.timestamp - currentAbsTs <= MAX_GAP_MS) {
        currentTracks.push(next);
      }
    }

    // Compute aspect-ratio-aware scaling
    const videoWidth = video.videoWidth || rect.width;
    const videoHeight = video.videoHeight || rect.height;
    const videoAspect = videoWidth / videoHeight;
    const containerAspect = rect.width / rect.height;

    let renderWidth: number, renderHeight: number, offsetX: number, offsetY: number;
    if (videoAspect > containerAspect) {
      renderWidth = rect.width;
      renderHeight = rect.width / videoAspect;
      offsetX = 0;
      offsetY = (rect.height - renderHeight) / 2;
    } else {
      renderHeight = rect.height;
      renderWidth = rect.height * videoAspect;
      offsetX = (rect.width - renderWidth) / 2;
      offsetY = 0;
    }

    const scaleX = renderWidth / videoWidth;
    const scaleY = renderHeight / videoHeight;

    // Draw bboxes
    for (const item of currentTracks) {
      const box = item.bbox as number[];
      if (!Array.isArray(box) || box.length < 4) continue;
      const [x, y, w, h] = box.map(Number);

      const drawX = offsetX + x * scaleX;
      const drawY = offsetY + y * scaleY;
      const drawW = w * scaleX;
      const drawH = h * scaleY;

      const color = getBehaviorHex(item.behavior);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fillStyle = color + "26";
      ctx.fillRect(drawX, drawY, drawW, drawH);
      ctx.strokeRect(drawX, drawY, drawW, drawH);

      const label = `${item.cow_id} · ${formatBehaviorLabel(item.behavior)}`;
      ctx.font = "600 12px Inter, sans-serif";
      const paddingX = 6;
      const paddingY = 4;
      const textWidth = ctx.measureText(label).width;
      const textHeight = 12;
      const badgeHeight = textHeight + paddingY * 2;
      const badgeWidth = textWidth + paddingX * 2;

      let badgeY = drawY - badgeHeight;
      if (badgeY < 0) badgeY = drawY;

      ctx.fillStyle = color;
      ctx.fillRect(drawX, badgeY, badgeWidth, badgeHeight);
      ctx.fillStyle = "#FFFFFF";
      ctx.textBaseline = "top";
      ctx.fillText(label, drawX + paddingX, badgeY + paddingY + 1);
    }
  }, [selectedSegment, tracks]);

  // Animation frame loop for drawing
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    let rafId: number | null = null;

    const startLoop = () => {
      if (rafId !== null) return;
      const loop = () => { drawTracks(); rafId = requestAnimationFrame(loop); };
      rafId = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    };

    const redraw = () => drawTracks();

    video.addEventListener("play", startLoop);
    video.addEventListener("pause", stopLoop);
    video.addEventListener("ended", stopLoop);
    video.addEventListener("seeked", redraw);
    video.addEventListener("loadeddata", redraw);
    video.addEventListener("loadedmetadata", redraw);
    window.addEventListener("resize", redraw);
    document.addEventListener("fullscreenchange", redraw);

    if (!video.paused && !video.ended) startLoop(); else redraw();

    return () => {
      stopLoop();
      video.removeEventListener("play", startLoop);
      video.removeEventListener("pause", stopLoop);
      video.removeEventListener("ended", stopLoop);
      video.removeEventListener("seeked", redraw);
      video.removeEventListener("loadeddata", redraw);
      video.removeEventListener("loadedmetadata", redraw);
      window.removeEventListener("resize", redraw);
      document.removeEventListener("fullscreenchange", redraw);
    };
  }, [videoSrc, drawTracks]);

  const videoStatus = loadingVideo ? "Loading" : videoError ? "Error" : videoSrc ? "Ready" : "Idle";

  return (
    <div className="p-6">
      <CPPageHeader
        title="Playback"
        subtitle="Review historical barn footage and play archived recording segments."
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedSegment(null); }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <CPButton onClick={() => { setSelectedSegment(null); refetch(); }} size="sm" className="flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" />
              Reload
            </CPButton>
          </div>
        }
      />

      {/* Loading / Error / Empty states */}
      {loadingSegments ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
          <Skeleton height={24} width={200} className="mb-3" />
          <Skeleton count={3} />
        </div>
      ) : isError ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-sm text-red-500">{error instanceof Error ? error.message : "Failed to load playback segments."}</p>
        </div>
      ) : segments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Playback Found</h2>
          <p className="text-sm text-gray-500">No recordings are available for this date.</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <StatCard title="Recording Date" value={selectedDate} />
            <StatCard title="Segments" value={String(segments.length)} />
            <StatCard title="Video Status" value={videoStatus} />
            <StatCard title="Selected" value={selectedSegment?.filename ?? "None"} />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_minmax(320px,1fr)] gap-5 items-stretch">
            {/* Video Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              {/* Video Top Bar */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Playback Viewer</h2>
                  <p className="text-xs text-gray-500 mt-1">{selectedDate}</p>
                </div>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-secondary text-green-900">
                  Connected
                </span>
              </div>

              {/* Video Area */}
              <div className="p-5">
                <div className="w-full aspect-video min-h-90 rounded-lg bg-gray-900 border border-gray-300 flex items-center justify-center relative overflow-hidden">
                  {loadingVideo ? (
                    <div className="text-center z-10 px-5">
                      <p className="text-3xl font-bold text-gray-50 tracking-wide">Loading Video...</p>
                      <p className="text-gray-300 mt-2 text-sm">Fetching protected video stream</p>
                    </div>
                  ) : videoError ? (
                    <div className="text-center z-10 px-5">
                      <p className="text-3xl font-bold text-gray-50 tracking-wide">Video Error</p>
                      <p className="text-red-400 mt-2 text-sm">{videoError}</p>
                    </div>
                  ) : videoSrc ? (
                    <div ref={wrapperRef} className="w-full h-full relative bg-black overflow-hidden">
                      <video
                        ref={videoRef}
                        controls
                        className="w-full h-full object-contain block bg-black"
                        src={videoSrc}
                      />
                      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                    </div>
                  ) : (
                    <div className="text-center z-10 px-5">
                      <p className="text-3xl font-bold text-gray-50 tracking-wide">No Video</p>
                      <p className="text-gray-400 mt-2 text-sm">Select a segment to begin playback.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Side Panel */}
            <div className="flex flex-col gap-5">
              {/* Playback Controls */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Controls</h3>

                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <CPButton
                      onClick={() => {
                        if (!videoRef.current) return;
                        if (videoRef.current.paused) videoRef.current.play().catch(() => {});
                        else videoRef.current.pause();
                      }}
                      size="sm"
                      className="flex items-center gap-1.5 justify-center w-full"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isPlaying ? "Pause" : "Play"}
                    </CPButton>
                    <CPButton
                      variant="secondary"
                      size="sm"
                      onClick={() => { if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.pause(); } }}
                      className="flex items-center gap-1 justify-center"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restart
                    </CPButton>

                    <CPButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (!wrapperRef.current) return;
                        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                        else wrapperRef.current.requestFullscreen().catch(() => {});
                      }}
                      className="flex items-center gap-1 justify-center"
                    >
                      <Maximize className="w-3.5 h-3.5" /> Fullscreen
                    </CPButton>

                    <CPButton
                      variant="secondary"
                      size="sm"
                      onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10); }}
                      className="flex items-center gap-1 justify-center"
                    >
                      <Rewind className="w-3.5 h-3.5" /> -10s
                    </CPButton>

                    <CPButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (videoRef.current) {
                          const dur = videoRef.current.duration || 0;
                          videoRef.current.currentTime = Math.min(dur, videoRef.current.currentTime + 10);
                        }
                      }}
                      className="flex items-center gap-1 justify-center"
                    >
                      <FastForward className="w-3.5 h-3.5" /> +10s
                    </CPButton>
                  </div>

                  <div className="flex gap-1.5 mt-1">
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setSpeed(s); if (videoRef.current) videoRef.current.playbackRate = s; }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md border transition-colors ${speed === s
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Available Segments */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 max-h-64 flex flex-col">
                <h3 className="text-sm font-bold text-gray-900 mb-3 shrink-0">Available Segments</h3>
                {segments.length === 0 ? (
                  <p className="text-sm text-gray-500">No segments for this date.</p>
                ) : (
                  <div className="flex flex-col gap-2 overflow-y-auto">
                    {segments.map((segment) => {
                      const isActive = selectedSegment?.id === segment.id;
                      return (
                        <button
                          key={segment.id}
                          type="button"
                          onClick={() => setSelectedSegment(segment)}
                          className={`flex items-start gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${isActive ? "bg-secondary" : "hover:bg-gray-50 border border-transparent"
                            }`}
                        >
                          <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? "bg-primary" : "bg-gray-400"}`} />
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${isActive ? "text-green-900" : "text-gray-900"} truncate`}>{segment.filename}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatTimestamp(segment.start_ts)} &rarr; {formatTimestamp(segment.end_ts)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Segment Detail */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Segment Detail</h3>
                {selectedSegment ? (
                  <dl className="text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <dt className="text-gray-500">ID</dt>
                      <dd className="font-semibold text-gray-900">{selectedSegment.id}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <dt className="text-gray-500">Filename</dt>
                      <dd className="font-semibold text-gray-900 text-right truncate ml-4">{selectedSegment.filename}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <dt className="text-gray-500">Start</dt>
                      <dd className="font-semibold text-gray-900">{formatTimestamp(selectedSegment.start_ts)}</dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-gray-500">End</dt>
                      <dd className="font-semibold text-gray-900">{formatTimestamp(selectedSegment.end_ts)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-gray-500">No segment selected.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
    </div>
  );
}


