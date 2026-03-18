import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { trackService } from "@/services/track";

interface VideoElementWithRVFC extends Omit<HTMLVideoElement, 'requestVideoFrameCallback'> {
  requestVideoFrameCallback?: (
    callback: (now: number, metadata: { mediaTime: number }) => void
  ) => number;
}

export interface UseHLSSyncProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  streamUrl: string;
  offsetMs?: number;
  activeBehaviors?: string[];
}

export function useHLSTrackSync({ videoRef, canvasRef, streamUrl, offsetMs = 0, activeBehaviors = [] }: UseHLSSyncProps) {
  const trackBufferRef = useRef<any[]>([]);
  const isFetchingRef = useRef(false);
  const syncStateRef = useRef({
    fragProgramDateTime: null as number | null,
    fragStartPts: 0,
    lastMediaTime: 0,
  });
  const activeBehaviorsRef = useRef(activeBehaviors);

  useEffect(() => {
    activeBehaviorsRef.current = activeBehaviors;
  }, [activeBehaviors]);

  useEffect(() => {
    const video = videoRef.current as VideoElementWithRVFC;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let hls: Hls | null = null;
    let animationFrameId: number;

    const getAbsoluteTime = () => {
      const { fragProgramDateTime, fragStartPts, lastMediaTime } = syncStateRef.current;
      if (!fragProgramDateTime) return null;
      
      const displayedTime = lastMediaTime || video.currentTime;
      const offsetSeconds = displayedTime - fragStartPts;
      console.log(offsetMs)
      return fragProgramDateTime + offsetSeconds * 1000 + offsetMs;
    };

    const smartFetch = async () => {
      if (!syncStateRef.current.fragProgramDateTime || isFetchingRef.current) return;
      const now = getAbsoluteTime();
      if (!now) return;

      isFetchingRef.current = true;
      const start = Math.floor(now - 5000);
      const end = Math.floor(now + 10000);

      try {
        const newTracks = await trackService.fetchTracksWindow(start, end);
        
        const cutoff = now - 20000;
        let buffer = trackBufferRef.current.filter((d) => d.timestamp > cutoff);
        
        const existingIds = new Set(buffer.map((d) => d.id));
        newTracks.forEach((item) => {
          if (!existingIds.has(item.id)) buffer.push(item);
        });
        
        buffer.sort((a, b) => a.timestamp - b.timestamp);
        trackBufferRef.current = buffer;
      } catch (error) {
        console.error("Failed to fetch tracks:", error);
      } finally {
        isFetchingRef.current = false;
      }
    };

    const drawLoop = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx || !video.videoWidth) {
        animationFrameId = requestAnimationFrame(drawLoop);
        return;
      }

      if (canvas.width !== canvas.clientWidth) canvas.width = canvas.clientWidth;
      if (canvas.height !== canvas.clientHeight) canvas.height = canvas.clientHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = getAbsoluteTime();

      if (now) {
        const scaleX = canvas.width / video.videoWidth;
        const scaleY = canvas.height / video.videoHeight;

        let closestTS: number | null = null;
        let closestDist = Infinity;
        
        trackBufferRef.current.forEach((item) => {
          const dist = now - item.timestamp;
          if (dist >= 0 && dist < closestDist) {
            closestDist = dist;
            closestTS = item.timestamp;
          }
        });

        if (closestTS !== null) {
          const cowMap = new Map();
          trackBufferRef.current.forEach((item) => {
            if (item.timestamp === closestTS) cowMap.set(item.cow_id, item);
          });

          // Define colors for different behaviors
          const BEHAVIOR_COLORS: Record<string, string> = {
            feeding: '#10b981',   // Emerald 500
            walking: '#3b82f6',   // Blue 500 
            standing: '#8b5cf6',  // Violet 500 
            lying: '#f59e0b',     // Amber 500
            default: '#ef4444'    // Red 500
          };

          cowMap.forEach((item) => {
            // Filter by active behaviors
            if (!activeBehaviorsRef.current.includes(item.behavior)) return;

            const bbox = item.bbox;
            const x = Array.isArray(bbox) ? bbox[0] : bbox.x;
            const y = Array.isArray(bbox) ? bbox[1] : bbox.y;
            const w = Array.isArray(bbox) ? bbox[2] : bbox.w || bbox.width;
            const h = Array.isArray(bbox) ? bbox[3] : bbox.h || bbox.height;

            const sx = x * scaleX;
            const sy = y * scaleY;
            const sw = w * scaleX;
            const sh = h * scaleY;

            const themeColor = BEHAVIOR_COLORS[item.behavior.toLowerCase()] || BEHAVIOR_COLORS.default;

            // ==========================================
            ctx.strokeStyle = themeColor;
            ctx.lineWidth = 2;
            
            ctx.fillStyle = themeColor + '26'; 
            ctx.fillRect(sx, sy, sw, sh);
            ctx.strokeRect(sx, sy, sw, sh);

            const label = `${item.cow_id} · ${item.behavior.toUpperCase()}`;
            
            ctx.font = "600 12px Inter, sans-serif";
            const paddingX = 6;
            const paddingY = 4;
            const textMetrics = ctx.measureText(label);
            const textWidth = textMetrics.width;
            const textHeight = 12;
            const badgeHeight = textHeight + paddingY * 2;
            const badgeWidth = textWidth + paddingX * 2;

            // If badge goes above the video, draw it below the bounding box
            let badgeY = sy - badgeHeight;
            if (badgeY < 0) {
              badgeY = sy;
            }

            ctx.fillStyle = themeColor;
            ctx.fillRect(sx, badgeY, badgeWidth, badgeHeight);

            ctx.fillStyle = "#FFFFFF"; 
            ctx.textBaseline = "top";
            ctx.fillText(label, sx + paddingX, badgeY + paddingY + 1);
          });
        }
      }

      animationFrameId = requestAnimationFrame(drawLoop);
    };

    const onVideoFrame = (_now: number, metadata: { mediaTime: number }) => {
      syncStateRef.current.lastMediaTime = metadata.mediaTime;
      if (video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(onVideoFrame);
      }
    };

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        liveSyncDurationCount: 2,
      });

      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls?.loadSource(streamUrl);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.warn("Auto-play blocked:", e));
      });

      hls.on(Hls.Events.FRAG_CHANGED, (_, data) => {
        if (data.frag.programDateTime) {
          syncStateRef.current.fragProgramDateTime = data.frag.programDateTime;
          syncStateRef.current.fragStartPts = data.frag.start;
          smartFetch();
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => video.play());
    }

    if (video.requestVideoFrameCallback) {
      video.requestVideoFrameCallback(onVideoFrame);
    }
    animationFrameId = requestAnimationFrame(drawLoop);

    return () => {
      if (hls) hls.destroy();
      cancelAnimationFrame(animationFrameId);
    };
  }, [streamUrl, offsetMs]);
}