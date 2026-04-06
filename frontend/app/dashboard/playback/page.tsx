"use client";

import { useEffect, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { RefreshCw, Play, Pause, RotateCcw, Rewind, FastForward, Maximize } from "lucide-react";
import CPPageHeader from "@/components/CPPageHeader";
import CPButton from "@/components/CPButton";
import { usePlaybackSegments } from "@/hooks/playback";
import { playbackService, VideoSegment } from "@/services/playback";
import { useVideoTrackSync } from "@/hooks/video-track-sync";

const SPEEDS = [1, 2, 4, 8] as const;

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString();
}

export default function PlaybackPage() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const [selectedSegment, setSelectedSegment] = useState<VideoSegment | null>(null);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useVideoTrackSync({ videoRef, canvasRef, wrapperRef, segment: selectedSegment, videoSrc, offsetMs: 4500 });

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
      return;
    }

    let cancelled = false;
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


