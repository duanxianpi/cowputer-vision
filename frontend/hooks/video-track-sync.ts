import { useCallback, useEffect, useRef } from "react";
import { trackService, TrackingData } from "@/services/track";
import { getBehaviorHex } from "@/constants/behaviorColors";
import { BEHAVIOR_LABELS } from "@/constants/behaviorColors";
import { VideoSegment } from "@/services/playback";

const PRELOAD_BEFORE_MS = 5000;
const PRELOAD_AFTER_MS = 15000;
const BUCKET_SIZE_MS = 5000;
const MAX_MATCH_DISTANCE_MS = 3000;

function formatBehaviorLabel(behavior?: string) {
  if (!behavior) return "";
  return BEHAVIOR_LABELS[behavior] ?? behavior;
}

export interface UseVideoTrackSyncProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  segment: VideoSegment | null;
  videoSrc: string | null;
  offsetMs?: number;
}

export function useVideoTrackSync({
  videoRef,
  canvasRef,
  wrapperRef,
  segment,
  videoSrc,
  offsetMs = 0,
}: UseVideoTrackSyncProps) {
  const tracksRef = useRef<TrackingData[]>([]);
  const loadedWindowsRef = useRef<Array<{ start: number; end: number }>>([]);
  const loadingWindowRef = useRef(false);

  // Reset track state when segment changes
  useEffect(() => {
    tracksRef.current = [];
    loadedWindowsRef.current = [];
  }, [segment]);

  const isWindowLoaded = useCallback((start: number, end: number) => {
    return loadedWindowsRef.current.some((w) => start >= w.start && end <= w.end);
  }, []);

  const mergeLoadedWindow = useCallback((start: number, end: number) => {
    const windows = [...loadedWindowsRef.current, { start, end }];
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
    loadedWindowsRef.current = merged;
  }, []);

  const loadTracksForWindow = useCallback(
    async (windowStart: number, windowEnd: number) => {
      if (loadingWindowRef.current || isWindowLoaded(windowStart, windowEnd)) return;

      loadingWindowRef.current = true;
      try {
        const data = await trackService.fetchTracksWindow(windowStart, windowEnd);
        const map = new Map<string, TrackingData>();
        for (const item of tracksRef.current)
          map.set(`${item.cow_id}_${item.timestamp}_${item.behavior}`, item);
        for (const item of data)
          map.set(`${item.cow_id}_${item.timestamp}_${item.behavior}`, item);
        const sorted = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
        tracksRef.current = sorted;
        mergeLoadedWindow(windowStart, windowEnd);
      } catch (err) {
        console.error("useVideoTrackSync: loadTracksForWindow error:", err);
      } finally {
        loadingWindowRef.current = false;
      }
    },
    [isWindowLoaded, mergeLoadedWindow]
  );

  // Preload tracks as video plays
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !segment || !videoSrc) return;

    let lastRequestedBucket = -1;

    const checkAndLoad = () => {
      const currentAbsTs = segment.start_ts + video.currentTime * 1000 + offsetMs;
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
  }, [segment, videoSrc, offsetMs, loadTracksForWindow, videoRef]);

  // Canvas drawing
  const drawTracks = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !segment) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = (wrapperRef.current ?? video).getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentAbsTs = segment.start_ts + video.currentTime * 1000 + offsetMs;

    // Find the nearest timestamp (past or future) to reduce visual lag.
    let closestTS: number | null = null;
    let closestDist = Infinity;
    for (const item of tracksRef.current) {
      const dist = Math.abs(currentAbsTs - item.timestamp);
      if (dist < closestDist) {
        closestDist = dist;
        closestTS = item.timestamp;
      }
    }

    if (closestTS === null || closestDist > MAX_MATCH_DISTANCE_MS) return;

    // Build a per-cow map for that exact snapshot
    const cowMap = new Map<string, TrackingData>();
    for (const item of tracksRef.current) {
      if (item.timestamp === closestTS) cowMap.set(item.cow_id, item);
    }

    // Aspect-ratio-aware scaling
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
    cowMap.forEach((item) => {
      const box = item.bbox as number[];
      if (!Array.isArray(box) || box.length < 4) return;
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
    });
  }, [segment, offsetMs, videoRef, canvasRef, wrapperRef]);

  // Animation frame loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !segment || !videoSrc) return;

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
  }, [segment, videoSrc, drawTracks, videoRef]);
}
