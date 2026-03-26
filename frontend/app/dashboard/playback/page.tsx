// "use client"; //只能播放前1分钟

// import Hls from "hls.js";
// import { useEffect, useMemo, useRef, useState } from "react";

// type EventItem = {
//   id: number;
//   time: string;
//   minute: number;
//   cowId: string;
//   behavior: string;
//   severity: "low" | "medium" | "high";
// };

// type PlaybackDay = {
//   date: string;
//   camera: string;
//   durationMinutes: number;
//   detectedCows: number;
//   alerts: number;
//   events: EventItem[];
// };

// type PlaybackSegment = {
//   id: number;
//   filename: string;
//   start_ts: number;
//   end_ts: number;
//   url: string;
// };

// type TrackItem = {
//   id: number;
//   cow_id: string;
//   timestamp: number;
//   behavior: string;
//   bbox: number[];
// };

// const BASE_URL = "http://70.69.192.6:29831";

// const playbackData: PlaybackDay[] = [
//   {
//     date: "2026-03-18",
//     camera: "Barn Cam 1",
//     durationMinutes: 180,
//     detectedCows: 12,
//     alerts: 3,
//     events: [
//       {
//         id: 1,
//         time: "08:12",
//         minute: 12,
//         cowId: "Cow-03",
//         behavior: "Drinking",
//         severity: "low",
//       },
//       {
//         id: 2,
//         time: "08:37",
//         minute: 37,
//         cowId: "Cow-08",
//         behavior: "Lying",
//         severity: "low",
//       },
//       {
//         id: 3,
//         time: "09:05",
//         minute: 65,
//         cowId: "Cow-02",
//         behavior: "Low activity",
//         severity: "medium",
//       },
//       {
//         id: 4,
//         time: "09:41",
//         minute: 101,
//         cowId: "Cow-11",
//         behavior: "Crowding",
//         severity: "medium",
//       },
//       {
//         id: 5,
//         time: "10:08",
//         minute: 128,
//         cowId: "Cow-05",
//         behavior: "Abnormal standing",
//         severity: "high",
//       },
//       {
//         id: 6,
//         time: "10:42",
//         minute: 162,
//         cowId: "Cow-01",
//         behavior: "Feeding",
//         severity: "low",
//       },
//     ],
//   },
//   {
//     date: "2026-03-19",
//     camera: "Barn Cam 1",
//     durationMinutes: 210,
//     detectedCows: 14,
//     alerts: 4,
//     events: [
//       {
//         id: 7,
//         time: "07:55",
//         minute: 5,
//         cowId: "Cow-09",
//         behavior: "Walking",
//         severity: "low",
//       },
//       {
//         id: 8,
//         time: "08:20",
//         minute: 30,
//         cowId: "Cow-04",
//         behavior: "Drinking",
//         severity: "low",
//       },
//       {
//         id: 9,
//         time: "08:58",
//         minute: 68,
//         cowId: "Cow-12",
//         behavior: "Isolation",
//         severity: "medium",
//       },
//       {
//         id: 10,
//         time: "09:26",
//         minute: 96,
//         cowId: "Cow-06",
//         behavior: "Low activity",
//         severity: "high",
//       },
//       {
//         id: 11,
//         time: "10:14",
//         minute: 144,
//         cowId: "Cow-10",
//         behavior: "Lying",
//         severity: "low",
//       },
//       {
//         id: 12,
//         time: "10:52",
//         minute: 182,
//         cowId: "Cow-02",
//         behavior: "Abnormal gait",
//         severity: "high",
//       },
//     ],
//   },
//   {
//     date: "2026-03-20",
//     camera: "Barn Cam 2",
//     durationMinutes: 150,
//     detectedCows: 10,
//     alerts: 2,
//     events: [
//       {
//         id: 13,
//         time: "11:02",
//         minute: 2,
//         cowId: "Cow-07",
//         behavior: "Feeding",
//         severity: "low",
//       },
//       {
//         id: 14,
//         time: "11:28",
//         minute: 28,
//         cowId: "Cow-01",
//         behavior: "Drinking",
//         severity: "low",
//       },
//       {
//         id: 15,
//         time: "12:10",
//         minute: 70,
//         cowId: "Cow-03",
//         behavior: "Low activity",
//         severity: "medium",
//       },
//       {
//         id: 16,
//         time: "12:46",
//         minute: 106,
//         cowId: "Cow-08",
//         behavior: "Abnormal standing",
//         severity: "high",
//       },
//       {
//         id: 17,
//         time: "13:18",
//         minute: 138,
//         cowId: "Cow-05",
//         behavior: "Walking",
//         severity: "low",
//       },
//     ],
//   },
// ];

// const cameras = ["Barn Cam 1", "Barn Cam 2"];
// const speeds = [1, 2, 4, 8];

// function pad(n: number) {
//   return n.toString().padStart(2, "0");
// }

// function formatClock(minute: number) {
//   const baseHour = 8;
//   const total = baseHour * 60 + minute;
//   const h = Math.floor(total / 60);
//   const m = total % 60;
//   return `${pad(h)}:${pad(m)}`;
// }

// function formatTimestamp(ts: number) {
//   return new Date(ts).toLocaleString();
// }

// function severityColor(severity: EventItem["severity"]) {
//   if (severity === "high") return "#ef4444";
//   if (severity === "medium") return "#f59e0b";
//   return "#22c55e";
// }

// export default function Page() {
//   const defaultDate = playbackData[1].date;

//   const [selectedDate, setSelectedDate] = useState(defaultDate);
//   const [selectedCamera, setSelectedCamera] = useState("Barn Cam 1");
//   const [currentMinute, setCurrentMinute] = useState(0);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [speed, setSpeed] = useState(1);

//   const [segments, setSegments] = useState<PlaybackSegment[]>([]);
//   const [tracks, setTracks] = useState<TrackItem[]>([]);
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//   const wrapperRef = useRef<HTMLDivElement | null>(null);
//   const [selectedSegment, setSelectedSegment] =
//     useState<PlaybackSegment | null>(null);
//   const [loadingSegments, setLoadingSegments] = useState(false);
//   const [segmentError, setSegmentError] = useState("");

//   const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
//   const [loadingVideo, setLoadingVideo] = useState(false);
//   const [videoError, setVideoError] = useState("");

//   const videoRef = useRef<HTMLVideoElement | null>(null);

//   const currentSession = useMemo(() => {
//     return segments.length > 0
//       ? {
//           date: selectedDate,
//           camera: selectedCamera,
//           durationMinutes: 1440,
//           detectedCows: 0,
//           alerts: 0,
//           events: [] as EventItem[],
//         }
//       : null;
//   }, [segments, selectedDate, selectedCamera]);

//   useEffect(() => {
//     setCurrentMinute(0);
//     setIsPlaying(false);
//   }, [selectedDate, selectedCamera]);

// //   useEffect(() => {
// //     const video = videoRef.current;
// //     if (!video) return;

// //     const handleTimeUpdate = () => {
// //         setCurrentMinute(video.currentTime / 60);
// //     };

// //     const handlePlay = () => setIsPlaying(true);
// //     const handlePause = () => setIsPlaying(false);
// //     const handleEnded = () => setIsPlaying(false);

// //     video.addEventListener("timeupdate", handleTimeUpdate);
// //     video.addEventListener("play", handlePlay);
// //     video.addEventListener("pause", handlePause);
// //     video.addEventListener("ended", handleEnded);

// //     return () => {
// //         video.removeEventListener("timeupdate", handleTimeUpdate);
// //         video.removeEventListener("play", handlePlay);
// //         video.removeEventListener("pause", handlePause);
// //         video.removeEventListener("ended", handleEnded);
// //     };
// //   }, [videoBlobUrl]);

//     useEffect(() => {
//         const video = videoRef.current;
//         if (!video || !videoBlobUrl) return;

//         let rafId: number | null = null;

//         const redraw = () => {
//             drawTracks();
//     };

//     const startLoop = () => {
//         if (rafId !== null) return;

//         const loop = () => {
//         drawTracks();
//         rafId = requestAnimationFrame(loop);
//         };

//         rafId = requestAnimationFrame(loop);
//     };

//     const stopLoop = () => {
//         if (rafId !== null) {
//         cancelAnimationFrame(rafId);
//         rafId = null;
//         }
//     };

//     video.addEventListener("play", startLoop);
//     video.addEventListener("pause", stopLoop);
//     video.addEventListener("ended", stopLoop);

//     video.addEventListener("seeked", redraw);
//     video.addEventListener("loadeddata", redraw);
//     video.addEventListener("loadedmetadata", redraw);

//     window.addEventListener("resize", redraw);
//     document.addEventListener("fullscreenchange", redraw);

//     if (!video.paused && !video.ended) {
//         startLoop();
//     } else {
//         redraw();
//     }

//     return () => {
//         stopLoop();

//         video.removeEventListener("play", startLoop);
//         video.removeEventListener("pause", stopLoop);
//         video.removeEventListener("ended", stopLoop);

//         video.removeEventListener("seeked", redraw);
//         video.removeEventListener("loadeddata", redraw);
//         video.removeEventListener("loadedmetadata", redraw);

//         window.removeEventListener("resize", redraw);
//         document.removeEventListener("fullscreenchange", redraw);
//     };
//   }, [videoBlobUrl, tracks, selectedSegment]);

//   async function loadPlaybackSegments(date: string) {
//     try {
//       setLoadingSegments(true);
//       setSegmentError("");
//       setSegments([]);
//       setSelectedSegment(null);

//       const token = localStorage.getItem("access_token");
//       console.log("access_token in page:", token);
//       console.log("selectedDate:", date);
//       console.log("origin:", window.location.origin);

//       if (!token) {
//         setSegmentError("No access token found. Please log in first.");
//         return;
//       }

//       const normalized = date.replaceAll("/", "-");
//       const [year, month, day] = normalized.split("-").map(Number);

//       const start = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
//       const end = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

//       console.log("selectedDate:", date);
//       console.log("start ts:", start);
//       console.log("end ts:", end);
//       console.log("start local:", new Date(start).toString());
//       console.log("end local:", new Date(end).toString());

//       const requestUrl = `${BASE_URL}/api/playback?end=${end}&start=${start}`;
//       console.log("playback request url:", requestUrl);

//       const res = await fetch(requestUrl, {
//         method: "GET",
//         headers: {
//           Accept: "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       console.log("playback response status:", res.status);

//       if (!res.ok) {
//         const errorText = await res.text();
//         console.log("playback error body:", errorText);
//         throw new Error(`Playback request failed: ${res.status} ${errorText}`);
//       }

//       const data: PlaybackSegment[] = await res.json();
//       console.log("playback response data:", data);

//       if (data.length > 0) {
//         console.log("first segment start_ts:", data[0].start_ts);
//         console.log(
//           "first segment start local:",
//           new Date(data[0].start_ts).toString()
//         );
//         console.log(
//           "first segment end local:",
//           new Date(data[0].end_ts).toString()
//         );
//       }

//       const sorted = [...data].sort((a, b) => a.start_ts - b.start_ts);
//       setSegments(sorted);
//       setSelectedSegment(sorted.length > 0 ? sorted[0] : null);
//     } catch (error) {
//       console.error("loadPlaybackSegments error:", error);
//       setSegmentError(
//         error instanceof Error
//           ? error.message
//           : "Failed to load playback segments."
//       );
//       setSegments([]);
//       setSelectedSegment(null);
//     } finally {
//       setLoadingSegments(false);
//     }
//   }

//   async function loadVideoFromSegment(segment: PlaybackSegment) {
//     try {
//       setLoadingVideo(true);
//       setVideoError("");

//       const token = localStorage.getItem("access_token");
//       console.log("access_token for video:", token);
//       console.log("video segment url from backend:", segment.url);

//       if (!token) {
//         setVideoError("No access token found. Please log in first.");
//         return;
//       }

//       if (videoBlobUrl) {
//         URL.revokeObjectURL(videoBlobUrl);
//         setVideoBlobUrl(null);
//       }

//       const realUrl = segment.url.includes("%03d")
//         ? segment.url.replace("%03d", "000")
//         : segment.url;

//       console.log("real video url:", realUrl);

//       const res = await fetch(realUrl, {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       console.log("video response status:", res.status);

//       if (!res.ok) {
//         const errorText = await res.text();
//         console.log("video error body:", errorText);
//         throw new Error(`Video request failed: ${res.status} ${errorText}`);
//       }

//       const blob = await res.blob();
//       console.log("video blob type:", blob.type, "size:", blob.size);
//       console.log("video response status:", res.status);
//       console.log("video content-type:", res.headers.get("content-type"));
//       console.log("video content-length:", res.headers.get("content-length"));


//       const objectUrl = URL.createObjectURL(blob);
//       setVideoBlobUrl(objectUrl);
//     } catch (error) {
//       console.error("loadVideoFromSegment error:", error);
//       setVideoError(
//         error instanceof Error
//           ? error.message
//           : "Failed to load video stream from backend URL."
//       );
//       setVideoBlobUrl(null);
//     } finally {
//       setLoadingVideo(false);
//     }
//   }

//   async function loadTracksForSegment(segment: PlaybackSegment) {
//     try {
//         const token = localStorage.getItem("access_token");
//         console.log("access_token for tracks:", token);

//         if (!token) {
//         console.error("No access token found for tracks.");
//         setTracks([]);
//         return;
//         }

//         const requestBody = {
//         and: [
//             { ">=": [{ var: "timestamp" }, segment.start_ts] },
//             { "<=": [{ var: "timestamp" }, segment.end_ts] }
//         ]
//         };

//         console.log("tracks request body:", requestBody);

//         const res = await fetch(`${BASE_URL}/api/tracks`, {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json",
//             Accept: "application/json",
//             Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(requestBody),
//         });

//         console.log("tracks response status:", res.status);

//         if (!res.ok) {
//         const errorText = await res.text();
//         console.log("tracks error body:", errorText);
//         throw new Error(`Tracks request failed: ${res.status} ${errorText}`);
//         }

//         const data: TrackItem[] = await res.json();
//         console.log("tracks response data:", data);
//         console.log("sample track:", data[0]);
//         console.log("sample bbox:", data[0]?.bbox);
//         setTracks(data);
//     } catch (error) {
//         console.error("loadTracksForSegment error:", error);
//         setTracks([]);
//     }

//   }

//   function drawTracks() {
//     const video = videoRef.current;
//     const canvas = canvasRef.current;
//     const segment = selectedSegment;

//     if (!video || !canvas || !segment) return;

//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     const wrapper = wrapperRef.current;
//     const rect = (wrapper ?? video).getBoundingClientRect();

//     canvas.width = rect.width;
//     canvas.height = rect.height;

//     ctx.clearRect(0, 0, canvas.width, canvas.height);

//     const BBOX_TIME_OFFSET_MS = 5300; //180
//     const currentAbsTs = segment.start_ts + video.currentTime * 1000 + BBOX_TIME_OFFSET_MS;

//     const candidates = tracks.filter(
//         (item) => Math.abs(item.timestamp - currentAbsTs) < 2000 //500
//     );

//     const bestTrackMap = new Map<string, TrackItem>();

//     for (const item of candidates) {
//         const prev = bestTrackMap.get(item.cow_id);
//         if (
//         !prev ||
//         Math.abs(item.timestamp - currentAbsTs) <
//             Math.abs(prev.timestamp - currentAbsTs)
//         ) {
//         bestTrackMap.set(item.cow_id, item);
//         }
//     }

//     const currentTracks = Array.from(bestTrackMap.values());

//     const videoWidth = video.videoWidth || rect.width;
//     const videoHeight = video.videoHeight || rect.height;

//     const containerWidth = rect.width;
//     const containerHeight = rect.height;

//     const videoAspect = videoWidth / videoHeight;
//     const containerAspect = containerWidth / containerHeight;

//     let renderWidth = 0;
//     let renderHeight = 0;
//     let offsetX = 0;
//     let offsetY = 0;

//     if (videoAspect > containerAspect) {
//         renderWidth = containerWidth;
//         renderHeight = containerWidth / videoAspect;
//         offsetX = 0;
//         offsetY = (containerHeight - renderHeight) / 2;
//     } else {
//         renderHeight = containerHeight;
//         renderWidth = containerHeight * videoAspect;
//         offsetY = 0;
//         offsetX = (containerWidth - renderWidth) / 2;
//     }

//     const scaleX = renderWidth / videoWidth;
//     const scaleY = renderHeight / videoHeight;

//     for (const item of currentTracks) {
//         const box = item.bbox;
//         if (!Array.isArray(box) || box.length < 4) continue;

//         const [x, y, w, h] = box.map(Number);

//         const drawX = offsetX + x * scaleX;
//         const drawY = offsetY + y * scaleY;
//         const drawW = w * scaleX;
//         const drawH = h * scaleY;

//         ctx.strokeStyle = "#22c55e";
//         ctx.lineWidth = 1;
//         ctx.strokeRect(drawX, drawY, drawW, drawH);

//         const label = `${item.cow_id}`;
//         ctx.font = "11px Arial";
//         const textWidth = ctx.measureText(label).width;
//         const textHeight = 14;

//         ctx.fillStyle = "rgba(34, 197, 94, 0.9)";
//         ctx.fillRect(
//         drawX,
//         Math.max(0, drawY - textHeight),
//         textWidth + 8,
//         textHeight
//         );

//         ctx.fillStyle = "#ffffff";
//         ctx.fillText(label, drawX + 4, Math.max(11, drawY - 3));
//     }
//   }



//   useEffect(() => {
//     loadPlaybackSegments(selectedDate);
//   }, [selectedDate]);

//   useEffect(() => {
//     if (selectedSegment) {
//       loadVideoFromSegment(selectedSegment);
//       loadTracksForSegment(selectedSegment);
//     } else {
//       if (videoBlobUrl) {
//         URL.revokeObjectURL(videoBlobUrl);
//       }
//       setVideoBlobUrl(null);
//       setVideoError("");
//     }

//     return () => {
//       if (videoBlobUrl) {
//         URL.revokeObjectURL(videoBlobUrl);
//       }
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedSegment]);

//   useEffect(() => {
//   const video = videoRef.current;
//   if (!video || !videoBlobUrl) return;

//   const redraw = () => {
//         requestAnimationFrame(() => drawTracks());
//     };

//     video.addEventListener("timeupdate", redraw);
//     video.addEventListener("seeked", redraw);
//     video.addEventListener("loadeddata", redraw);
//     video.addEventListener("loadedmetadata", redraw);
//     video.addEventListener("play", redraw);
//     window.addEventListener("resize", redraw);
//     document.addEventListener("fullscreenchange", redraw);

//     redraw();

//     return () => {
//         video.removeEventListener("timeupdate", redraw);
//         video.removeEventListener("seeked", redraw);
//         video.removeEventListener("loadeddata", redraw);
//         video.removeEventListener("loadedmetadata", redraw);
//         video.removeEventListener("play", redraw);
//         window.removeEventListener("resize", redraw);
//         document.removeEventListener("fullscreenchange", redraw);
//     };
//   }, [videoBlobUrl, tracks, selectedSegment]);

//   const upcomingEvents = useMemo(() => {
//     return [];
//   }, []);

//   const activeWindowEvents = useMemo(() => {
//     return upcomingEvents.filter(
//       (event) => Math.abs(event.minute - currentMinute) <= 18
//     );
//   }, [upcomingEvents, currentMinute]);

//   const currentEvent = useMemo(() => {
//     const reversed = [...upcomingEvents].reverse();
//     return reversed.find((event) => event.minute <= currentMinute) || null;
//   }, [upcomingEvents, currentMinute]);

//   return (
//     <div style={styles.page}>
//       <div style={styles.header}>
//         <div>
//           <div style={styles.kicker}>Cowputer Vision</div>
//           <h1 style={styles.title}>Playback Center</h1>
//           <p style={styles.subtitle}>
//             Review historical barn footage and play backend playback segments
//             directly.
//           </p>
//         </div>

//         <div style={styles.headerActions}>
//           <div style={styles.inputGroup}>
//             <label style={styles.label}>Select Date</label>
//             <input
//               type="date"
//               value={selectedDate}
//               onChange={(e) => setSelectedDate(e.target.value)}
//               style={styles.input}
//             />
//           </div>

//           <div style={styles.inputGroup}>
//             <label style={styles.label}>Camera</label>
//             <select
//               value={selectedCamera}
//               onChange={(e) => setSelectedCamera(e.target.value)}
//               style={styles.input}
//             >
//               {cameras.map((camera) => (
//                 <option key={camera} value={camera}>
//                   {camera}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div style={styles.inputGroup}>
//             <label style={styles.label}>Action</label>
//             <button
//               onClick={() => loadPlaybackSegments(selectedDate)}
//               style={styles.primaryButton}
//             >
//               Reload Segments
//             </button>
//           </div>
//         </div>
//       </div>

//       {loadingSegments ? (
//         <div style={styles.emptyState}>
//           <h2 style={{ marginBottom: 8 }}>Loading...</h2>
//           <p style={{ color: "#6b7280" }}>Loading playback segments.</p>
//         </div>
//       ) : segmentError ? (
//         <div style={styles.emptyState}>
//           <h2 style={{ marginBottom: 8 }}>Error</h2>
//           <p style={{ color: "#ef4444" }}>{segmentError}</p>
//         </div>
//       ) : segments.length === 0 ? (
//         <div style={styles.emptyState}>
//           <h2 style={{ marginBottom: 8 }}>No playback found</h2>
//           <p style={{ color: "#6b7280" }}>
//             No recording is available for this date and camera combination.
//           </p>
//         </div>
//       ) : (
//         <>
//           <div style={styles.statsRow}>
//             <StatCard
//               title="Recording Date"
//               value={currentSession?.date ?? selectedDate}
//               sub="Selected day"
//             />
//             <StatCard
//               title="Camera"
//               value={currentSession?.camera ?? selectedCamera}
//               sub="Frontend selection"
//             />
//             <StatCard
//               title="Segments"
//               value={String(segments.length)}
//               sub="Returned by backend"
//             />
//             <StatCard
//               title="Video Status"
//               value={
//                 loadingVideo
//                   ? "Loading"
//                   : videoError
//                   ? "Error"
//                   : videoBlobUrl
//                   ? "Ready"
//                   : "Idle"
//               }
//               sub="Playback stream"
//             />
//           </div>

//           <div style={styles.mainGrid}>
//             <div style={styles.videoPanel}>
//               <div style={styles.videoTopBar}>
//                 <div>
//                   <div style={styles.videoTitle}>Playback Viewer</div>
//                   <div style={styles.videoMeta}>
//                     {selectedCamera} · {selectedDate}
//                   </div>
//                 </div>
//                 <div style={styles.liveBadge}>Backend Connected</div>
//               </div>

//               <div style={styles.videoArea}>
//                 <div style={styles.videoOverlayTop}>
//                   <span>Current Time: {videoRef.current ? formatVideoTime(videoRef.current.currentTime) : "0:00"}</span>
//                   <span>Selected Date: {selectedDate}</span>
//                 </div>

//                 <div style={styles.videoPlaceholder}>
//                   {loadingSegments ? (
//                     <div style={styles.videoCenterText}>
//                       <div style={styles.playbackBigText}>Loading...</div>
//                       <div style={styles.videoPlaceholderText}>
//                         Loading playback segments
//                       </div>
//                     </div>
//                   ) : segmentError ? (
//                     <div style={styles.videoCenterText}>
//                       <div style={styles.playbackBigText}>Error</div>
//                       <div style={{ color: "#ef4444", marginTop: 8 }}>
//                         {segmentError}
//                       </div>
//                     </div>
//                   ) : loadingVideo ? (
//                     <div style={styles.videoCenterText}>
//                       <div style={styles.playbackBigText}>Loading Video...</div>
//                       <div style={styles.videoPlaceholderText}>
//                         Fetching protected video stream with token
//                       </div>
//                     </div>
//                   ) : videoError ? (
//                     <div style={styles.videoCenterText}>
//                       <div style={styles.playbackBigText}>Video Error</div>
//                       <div style={{ color: "#ef4444", marginTop: 8 }}>
//                         {videoError}
//                       </div>
//                     </div>
//                   ) : videoBlobUrl ? (
//                     // <video
//                     // ref={videoRef}
//                     // controls
//                     // style={styles.videoElement}
//                     // src={videoBlobUrl ?? undefined}
//                     // />
//                     <div ref={wrapperRef} style={styles.videoPlayerWrap}>
//                       <video
//                         ref={videoRef}
//                         controls
//                         style={styles.videoElement}
//                         src={videoBlobUrl ?? undefined}
//                       />

//                       <canvas
//                         ref={canvasRef}
//                         style={styles.canvasOverlay}
//                       />
//                     </div>

//                   ) : selectedSegment ? (
//                     <div style={styles.videoCenterText}>
//                       <div style={styles.playbackBigText}>Segment Ready</div>
//                       <div style={styles.videoPlaceholderText}>
//                         {selectedSegment.filename}
//                       </div>
//                       <div style={styles.videoPlaceholderSubText}>
//                         Select or reload a segment to try playback.
//                       </div>
//                     </div>
//                   ) : (
//                     <div style={styles.videoCenterText}>
//                       <div style={styles.playbackBigText}>No Video</div>
//                       <div style={styles.videoPlaceholderText}>
//                         No playback segment found
//                       </div>
//                       <div style={styles.videoPlaceholderSubText}>
//                         Try another date or check backend data range.
//                       </div>
//                     </div>
//                   )}
//                 </div>

//                 <div style={styles.videoOverlayBottom}>
//                   <span>
//                     Current Event:{" "}
//                     {currentEvent
//                       ? `${currentEvent.behavior} (${currentEvent.cowId})`
//                       : "No event yet"}
//                   </span>
//                   <span>
//                     Segment: {selectedSegment ? selectedSegment.id : "None"}
//                   </span>
//                 </div>
//               </div>

//               <div style={styles.controlsSection}>
//                 <div style={styles.timelineHeader}>
//                   <span style={{ fontWeight: 600 }}>Timeline</span>
//                   <span style={{ color: "#6b7280" }}>
//                     {videoRef.current ? formatVideoTime(videoRef.current.currentTime) : "0:00"}
//                   </span>
//                 </div>

//                 <div style={styles.timelineWrap}>
//                   <input
//                     type="range"
//                     min={0}
//                     max={videoRef.current?.duration || 0}
//                     value={videoRef.current?.currentTime || 0}
//                     onChange={(e) => {
//                         const value = Number(e.target.value);
//                         if (videoRef.current) {
//                         videoRef.current.currentTime = value;
//                         }
//                     }}
//                     style={styles.range}
//                   />
//                   <div style={styles.timelineMarkers}>
//                     {(currentSession?.events ?? []).map((event) => (
//                       <div
//                         key={event.id}
//                         title={`${event.time} · ${event.behavior} · ${event.cowId}`}
//                         style={{
//                           ...styles.timelineMarker,
//                           left: `${
//                             (event.minute /
//                               (currentSession?.durationMinutes ?? 1440)) *
//                             100
//                           }%`,
//                           backgroundColor: severityColor(event.severity),
//                         }}
//                       />
//                     ))}
//                   </div>
//                 </div>

//                 <div style={styles.buttonRow}>
//                   <button
//                     onClick={() => {
//                         if (!videoRef.current) return;

//                         if (videoRef.current.paused) {
//                         videoRef.current?.play().catch(() => {});
//                         } else {
//                         videoRef.current.pause();
//                         }
//                     }}
//                     style={{ ...styles.primaryButton, minWidth: 110 }}
//                   >
//                     {isPlaying ? "Pause" : "Play"}
//                   </button>

//                   <button
//                     onClick={() => {
//                         if (!videoRef.current) return;

//                         videoRef.current.currentTime = 0;
//                         videoRef.current.pause();
//                     }}
//                     style={styles.secondaryButton}
//                   >
//                     Restart
//                   </button>

//                   <button
//                     onClick={() => {
//                         if (!videoRef.current) return;

//                         videoRef.current.currentTime = Math.max(
//                         0,
//                         videoRef.current.currentTime - 10
//                         );
//                     }}
//                     style={styles.secondaryButton}
//                   >
//                     -10 sec
//                   </button>

//                   <button
//                     onClick={() => {
//                         if (!videoRef.current) return;

//                         const duration = videoRef.current.duration || 0;
//                         videoRef.current.currentTime = Math.min(
//                         duration,
//                         videoRef.current.currentTime + 10
//                         );
//                     }}
//                     style={styles.secondaryButton}
//                   >
//                     +10 sec
//                   </button>

//                   <button
//                     onClick={() => {
//                         if (!wrapperRef.current) return;

//                         if (document.fullscreenElement) {
//                         document.exitFullscreen().catch(() => {});
//                         } else {
//                         wrapperRef.current.requestFullscreen().catch(() => {});
//                         }
//                     }}
//                     style={styles.secondaryButton}
//                   >
//                     Fullscreen
//                   </button>

//                   <div style={styles.speedGroup}>
//                     {speeds.map((item) => (
//                         <button
//                             key={item}
//                             onClick={() => {
//                             setSpeed(item);

//                             if (videoRef.current) {
//                                 videoRef.current.playbackRate = item;
//                             }
//                             }}
//                             style={{
//                                 ...styles.speedButton,
//                                 background: speed === item ? "#16a34a" : "#ffffff",
//                                 color: speed === item ? "#ffffff" : "#111827",
//                                 borderColor: speed === item ? "#16a34a" : "#d1d5db",
//                             }}
//                         >
//                             {item}x
//                         </button>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div style={styles.sidePanel}>
//               <div style={styles.sideCard}>
//                 <div style={styles.sideCardTitle}>Available Segments</div>

//                 {segments.length === 0 ? (
//                   <div style={styles.noEvent}>
//                     No playback segments for this date.
//                   </div>
//                 ) : (
//                   <div style={styles.eventList}>
//                     {segments.map((segment) => (
//                       <div
//                         key={segment.id}
//                         onClick={() => setSelectedSegment(segment)}
//                         style={{
//                           ...styles.eventItem,
//                           cursor: "pointer",
//                           background:
//                             selectedSegment?.id === segment.id
//                               ? "#f0fdf4"
//                               : "transparent",
//                           borderRadius: 8,
//                           paddingLeft: 10,
//                           paddingRight: 10,
//                         }}
//                       >
//                         <div
//                           style={{
//                             ...styles.eventDot,
//                             backgroundColor:
//                               selectedSegment?.id === segment.id
//                                 ? "#16a34a"
//                                 : "#9ca3af",
//                           }}
//                         />
//                         <div style={{ flex: 1 }}>
//                           <div style={styles.eventMainLine}>
//                             <span>{segment.filename}</span>
//                           </div>
//                           <div style={styles.eventSubLine}>
//                             {formatTimestamp(segment.start_ts)} →{" "}
//                             {formatTimestamp(segment.end_ts)}
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               <div style={styles.sideCard}>
//                 <div style={styles.sideCardTitle}>Selected Segment Detail</div>

//                 {selectedSegment ? (
//                   <>
//                     <div style={styles.snapshotItem}>
//                       <span style={styles.snapshotLabel}>Segment ID</span>
//                       <span style={styles.snapshotValue}>
//                         {selectedSegment.id}
//                       </span>
//                     </div>
//                     <div style={styles.snapshotItem}>
//                       <span style={styles.snapshotLabel}>Filename</span>
//                       <span style={styles.snapshotValue}>
//                         {selectedSegment.filename}
//                       </span>
//                     </div>
//                     <div style={styles.snapshotItem}>
//                       <span style={styles.snapshotLabel}>Start</span>
//                       <span style={styles.snapshotValue}>
//                         {formatTimestamp(selectedSegment.start_ts)}
//                       </span>
//                     </div>
//                     <div style={styles.snapshotItem}>
//                       <span style={styles.snapshotLabel}>End</span>
//                       <span style={styles.snapshotValue}>
//                         {formatTimestamp(selectedSegment.end_ts)}
//                       </span>
//                     </div>

//                     <div
//                       style={{
//                         marginTop: 16,
//                         padding: 12,
//                         borderRadius: 8,
//                         background: "#f9fafb",
//                         border: "1px solid #e5e7eb",
//                         wordBreak: "break-all",
//                         fontSize: 13,
//                         color: "#374151",
//                       }}
//                     >
//                       <strong>Returned URL:</strong>
//                       <div style={{ marginTop: 8 }}>{selectedSegment.url}</div>
//                     </div>
//                   </>
//                 ) : (
//                   <div style={styles.noEvent}>No segment selected.</div>
//                 )}
//               </div>

//               <div style={styles.sideCard}>
//                 <div style={styles.sideCardTitle}>Nearby Events</div>
//                 <div style={styles.eventList}>
//                   {activeWindowEvents.length === 0 ? (
//                     <div style={styles.noEvent}>
//                       No nearby events around this time.
//                     </div>
//                   ) : (
//                     activeWindowEvents.map((event) => (
//                       <div key={event.id} style={styles.eventItem}>
//                         <div
//                           style={{
//                             ...styles.eventDot,
//                             backgroundColor: severityColor(event.severity),
//                           }}
//                         />
//                         <div style={{ flex: 1 }}>
//                           <div style={styles.eventMainLine}>
//                             <span>{event.behavior}</span>
//                             <span style={styles.eventTime}>{event.time}</span>
//                           </div>
//                           <div style={styles.eventSubLine}>
//                             {event.cowId} · {event.severity} priority
//                           </div>
//                         </div>
//                       </div>
//                     ))
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// function StatCard({
//   title,
//   value,
//   sub,
// }: {
//   title: string;
//   value: string;
//   sub: string;
// }) {
//   return (
//     <div style={styles.statCard}>
//       <div style={styles.statTitle}>{title}</div>
//       <div style={styles.statValue}>{value}</div>
//       <div style={styles.statSub}>{sub}</div>
//     </div>
//   );
// }

// function formatVideoTime(seconds: number) {
//   const total = Math.floor(seconds);
//   const m = Math.floor(total / 60);
//   const s = total % 60;
//   return `${m}:${s.toString().padStart(2, "0")}`;
// }

// const styles: Record<string, React.CSSProperties> = {
//   page: {
//     minHeight: "100vh",
//     background: "#f6f7f9",
//     color: "#111827",
//     padding: "24px",
//     fontFamily: "Arial, sans-serif",
//   },
//   header: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "flex-start",
//     gap: "24px",
//     marginBottom: "24px",
//     flexWrap: "wrap",
//   },
//   kicker: {
//     fontSize: 13,
//     color: "#16a34a",
//     letterSpacing: 1.2,
//     textTransform: "uppercase",
//     marginBottom: 8,
//     fontWeight: 700,
//   },
//   title: {
//     margin: 0,
//     fontSize: 32,
//     lineHeight: 1.1,
//     fontWeight: 700,
//     color: "#111827",
//   },
//   subtitle: {
//     marginTop: 10,
//     color: "#6b7280",
//     maxWidth: 760,
//     fontSize: 14,
//   },
//   headerActions: {
//     display: "flex",
//     gap: "14px",
//     flexWrap: "wrap",
//   },
//   inputGroup: {
//     display: "flex",
//     flexDirection: "column",
//     gap: 8,
//   },
//   label: {
//     fontSize: 13,
//     color: "#374151",
//     fontWeight: 600,
//   },
//   input: {
//     padding: "10px 14px",
//     borderRadius: 8,
//     border: "1px solid #d1d5db",
//     background: "#ffffff",
//     color: "#111827",
//     minWidth: 190,
//     outline: "none",
//   },
//   emptyState: {
//     border: "1px solid #e5e7eb",
//     borderRadius: 12,
//     background: "#ffffff",
//     padding: 32,
//     marginTop: 20,
//   },
//   statsRow: {
//     display: "grid",
//     gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
//     gap: 16,
//     marginBottom: 20,
//   },
//   statCard: {
//     background: "#ffffff",
//     border: "1px solid #e5e7eb",
//     borderRadius: 10,
//     padding: 18,
//     boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
//   },
//   statTitle: {
//     color: "#6b7280",
//     fontSize: 13,
//     marginBottom: 12,
//   },
//   statValue: {
//     fontSize: 24,
//     fontWeight: 700,
//     marginBottom: 6,
//     color: "#111827",
//   },
//   statSub: {
//     color: "#9ca3af",
//     fontSize: 13,
//   },
//   mainGrid: {
//     display: "grid",
//     gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 0.95fr)",
//     gap: 20,
//     alignItems: "start",
//   },
//   videoPanel: {
//     background: "#ffffff",
//     border: "1px solid #e5e7eb",
//     borderRadius: 10,
//     overflow: "hidden",
//     boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
//   },
//   videoTopBar: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     padding: "16px 20px",
//     borderBottom: "1px solid #e5e7eb",
//     background: "#ffffff",
//   },
//   videoTitle: {
//     fontSize: 18,
//     fontWeight: 700,
//     color: "#111827",
//   },
//   videoMeta: {
//     color: "#6b7280",
//     marginTop: 6,
//     fontSize: 13,
//   },
//   liveBadge: {
//     background: "#dcfce7",
//     color: "#15803d",
//     border: "1px solid #bbf7d0",
//     padding: "6px 12px",
//     borderRadius: 999,
//     fontSize: 13,
//     fontWeight: 700,
//   },
//   videoArea: {
//     padding: 20,
//     background: "#ffffff",
//   },
//   videoOverlayTop: {
//     display: "flex",
//     justifyContent: "space-between",
//     color: "#6b7280",
//     fontSize: 13,
//     marginBottom: 12,
//     gap: 12,
//     flexWrap: "wrap",
//   },
//   videoPlaceholder: {
//     width: "100%",
//     aspectRatio: "16 / 9",
//     minHeight: 360,
//     borderRadius: 10,
//     background: "#111827",
//     border: "1px solid #d1d5db",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     position: "relative",
//     overflow: "hidden",
//   },

//   videoPlayerWrap: {
//     width: "100%",
//     height: "100%",
//     position: "relative",
//     background: "#000000",
//     overflow: "hidden",
//   },

//   videoElement: {
//     width: "100%",
//     height: "100%",
//     objectFit: "contain",
//     display: "block",
//     background: "#000000",
//   },

//   canvasOverlay: {
//     position: "absolute",
//     inset: 0,
//     width: "100%",
//     height: "100%",
//     pointerEvents: "none",
//   },
//   videoCenterText: {
//     textAlign: "center",
//     zIndex: 2,
//     padding: "0 20px",
//   },
//   playbackBigText: {
//     fontSize: 40,
//     fontWeight: 700,
//     color: "#f9fafb",
//     letterSpacing: 1,
//   },
//   videoPlaceholderText: {
//     color: "#e5e7eb",
//     marginTop: 8,
//   },
//   videoPlaceholderSubText: {
//     color: "#9ca3af",
//     marginTop: 6,
//     fontSize: 14,
//   },
//   videoOverlayBottom: {
//     display: "flex",
//     justifyContent: "space-between",
//     color: "#6b7280",
//     fontSize: 13,
//     marginTop: 12,
//     gap: 12,
//     flexWrap: "wrap",
//   },
//   controlsSection: {
//     borderTop: "1px solid #e5e7eb",
//     padding: 20,
//     background: "#ffffff",
//   },
//   timelineHeader: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 14,
//     color: "#111827",
//   },
//   timelineWrap: {
//     position: "relative",
//     marginBottom: 18,
//     paddingTop: 12,
//     paddingBottom: 8,
//   },
//   range: {
//     width: "100%",
//     cursor: "pointer",
//   },
//   timelineMarkers: {
//     position: "absolute",
//     left: 0,
//     right: 0,
//     top: 18,
//     height: 12,
//     pointerEvents: "none",
//   },
//   timelineMarker: {
//     position: "absolute",
//     width: 8,
//     height: 8,
//     borderRadius: 999,
//     transform: "translateX(-50%)",
//     boxShadow: "0 0 0 2px #ffffff",
//   },
//   buttonRow: {
//     display: "flex",
//     gap: 10,
//     flexWrap: "wrap",
//     alignItems: "center",
//   },
//   primaryButton: {
//     padding: "10px 18px",
//     borderRadius: 8,
//     border: "none",
//     background: "#16a34a",
//     color: "#ffffff",
//     fontWeight: 700,
//     cursor: "pointer",
//   },
//   secondaryButton: {
//     padding: "10px 16px",
//     borderRadius: 8,
//     border: "1px solid #d1d5db",
//     background: "#ffffff",
//     color: "#111827",
//     fontWeight: 600,
//     cursor: "pointer",
//   },
//   speedGroup: {
//     display: "flex",
//     gap: 8,
//     marginLeft: "auto",
//     flexWrap: "wrap",
//   },
//   speedButton: {
//     padding: "10px 12px",
//     borderRadius: 8,
//     border: "1px solid #d1d5db",
//     cursor: "pointer",
//     fontWeight: 700,
//     background: "#ffffff",
//     color: "#111827",
//   },
//   sidePanel: {
//     display: "flex",
//     flexDirection: "column",
//     gap: 16,
//   },
//   sideCard: {
//     background: "#ffffff",
//     border: "1px solid #e5e7eb",
//     borderRadius: 10,
//     padding: 18,
//     boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
//   },
//   sideCardTitle: {
//     fontSize: 17,
//     fontWeight: 700,
//     marginBottom: 14,
//     color: "#111827",
//   },
//   snapshotItem: {
//     display: "flex",
//     justifyContent: "space-between",
//     gap: 12,
//     padding: "10px 0",
//     borderBottom: "1px solid #e5e7eb",
//   },
//   snapshotLabel: {
//     color: "#6b7280",
//     fontSize: 14,
//   },
//   snapshotValue: {
//     fontWeight: 700,
//     fontSize: 14,
//     color: "#111827",
//   },
//   eventList: {
//     display: "flex",
//     flexDirection: "column",
//     gap: 12,
//   },
//   noEvent: {
//     color: "#6b7280",
//     fontSize: 14,
//     paddingTop: 6,
//   },
//   eventItem: {
//     display: "flex",
//     gap: 12,
//     padding: "12px 0",
//     borderBottom: "1px solid #e5e7eb",
//     alignItems: "flex-start",
//   },
//   eventDot: {
//     width: 10,
//     height: 10,
//     borderRadius: 999,
//     marginTop: 7,
//     flexShrink: 0,
//   },
//   eventMainLine: {
//     display: "flex",
//     justifyContent: "space-between",
//     gap: 12,
//     fontWeight: 700,
//     fontSize: 14,
//     color: "#111827",
//   },
//   eventTime: {
//     color: "#6b7280",
//     fontWeight: 600,
//   },
//   eventSubLine: {
//     marginTop: 6,
//     color: "#6b7280",
//     fontSize: 13,
//   },
// };


"use client"; // 能连续播放，但是快进，+秒，bbox就没了

import { useEffect, useMemo, useRef, useState } from "react";

type EventItem = {
  id: number;
  time: string;
  minute: number;
  cowId: string;
  behavior: string;
  severity: "low" | "medium" | "high";
};

type PlaybackDay = {
  date: string;
  camera: string;
  durationMinutes: number;
  detectedCows: number;
  alerts: number;
  events: EventItem[];
};

type PlaybackSegment = {
  id: number;
  filename: string;
  start_ts: number;
  end_ts: number;
  url: string;
};

type TrackItem = {
  id: number;
  cow_id: string;
  timestamp: number;
  behavior: string;
  bbox: number[];
};

const BASE_URL = "http://70.69.192.6:29831";

const playbackData: PlaybackDay[] = [
  {
    date: "2026-03-18",
    camera: "Barn Cam 1",
    durationMinutes: 180,
    detectedCows: 12,
    alerts: 3,
    events: [
      {
        id: 1,
        time: "08:12",
        minute: 12,
        cowId: "Cow-03",
        behavior: "Drinking",
        severity: "low",
      },
      {
        id: 2,
        time: "08:37",
        minute: 37,
        cowId: "Cow-08",
        behavior: "Lying",
        severity: "low",
      },
      {
        id: 3,
        time: "09:05",
        minute: 65,
        cowId: "Cow-02",
        behavior: "Low activity",
        severity: "medium",
      },
      {
        id: 4,
        time: "09:41",
        minute: 101,
        cowId: "Cow-11",
        behavior: "Crowding",
        severity: "medium",
      },
      {
        id: 5,
        time: "10:08",
        minute: 128,
        cowId: "Cow-05",
        behavior: "Abnormal standing",
        severity: "high",
      },
      {
        id: 6,
        time: "10:42",
        minute: 162,
        cowId: "Cow-01",
        behavior: "Feeding",
        severity: "low",
      },
    ],
  },
  {
    date: "2026-03-19",
    camera: "Barn Cam 1",
    durationMinutes: 210,
    detectedCows: 14,
    alerts: 4,
    events: [
      {
        id: 7,
        time: "07:55",
        minute: 5,
        cowId: "Cow-09",
        behavior: "Walking",
        severity: "low",
      },
      {
        id: 8,
        time: "08:20",
        minute: 30,
        cowId: "Cow-04",
        behavior: "Drinking",
        severity: "low",
      },
      {
        id: 9,
        time: "08:58",
        minute: 68,
        cowId: "Cow-12",
        behavior: "Isolation",
        severity: "medium",
      },
      {
        id: 10,
        time: "09:26",
        minute: 96,
        cowId: "Cow-06",
        behavior: "Low activity",
        severity: "high",
      },
      {
        id: 11,
        time: "10:14",
        minute: 144,
        cowId: "Cow-10",
        behavior: "Lying",
        severity: "low",
      },
      {
        id: 12,
        time: "10:52",
        minute: 182,
        cowId: "Cow-02",
        behavior: "Abnormal gait",
        severity: "high",
      },
    ],
  },
  {
    date: "2026-03-20",
    camera: "Barn Cam 2",
    durationMinutes: 150,
    detectedCows: 10,
    alerts: 2,
    events: [
      {
        id: 13,
        time: "11:02",
        minute: 2,
        cowId: "Cow-07",
        behavior: "Feeding",
        severity: "low",
      },
      {
        id: 14,
        time: "11:28",
        minute: 28,
        cowId: "Cow-01",
        behavior: "Drinking",
        severity: "low",
      },
      {
        id: 15,
        time: "12:10",
        minute: 70,
        cowId: "Cow-03",
        behavior: "Low activity",
        severity: "medium",
      },
      {
        id: 16,
        time: "12:46",
        minute: 106,
        cowId: "Cow-08",
        behavior: "Abnormal standing",
        severity: "high",
      },
      {
        id: 17,
        time: "13:18",
        minute: 138,
        cowId: "Cow-05",
        behavior: "Walking",
        severity: "low",
      },
    ],
  },
];

const cameras = ["Barn Cam 1", "Barn Cam 2"];
const speeds = [1, 2, 4, 8];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString();
}

function severityColor(severity: EventItem["severity"]) {
  if (severity === "high") return "#ef4444";
  if (severity === "medium") return "#f59e0b";
  return "#22c55e";
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
  return [
    lerp(prevBox[0], nextBox[0], t),
    lerp(prevBox[1], nextBox[1], t),
    lerp(prevBox[2], nextBox[2], t),
    lerp(prevBox[3], nextBox[3], t),
  ];
}

function formatBehaviorLabel(behavior?: string) {
  if (!behavior) return "";

  const map: Record<string, string> = {
    walking: "walk",
    standing: "stand",
    feeding_head_up: "feed_up",
    feeding_head_down: "feed_down",
    licking: "lick",
    drinking: "drink",
    lying: "lie",
    unknown: "unknown",
  };

  return map[behavior] ?? behavior;
}

export default function Page() {
  const defaultDate = "2026-03-25";

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [selectedCamera, setSelectedCamera] = useState("Barn Cam 1");
  const [currentMinute, setCurrentMinute] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const [segments, setSegments] = useState<PlaybackSegment[]>([]);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<PlaybackSegment | null>(null);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [segmentError, setSegmentError] = useState("");

  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const loadedTrackWindowsRef = useRef<Array<{ start: number; end: number }>>([]);
  const loadingTrackWindowRef = useRef(false);

  const currentSession = useMemo(() => {
    return segments.length > 0
      ? {
          date: selectedDate,
          camera: selectedCamera,
          durationMinutes: 1440,
          detectedCows: 0,
          alerts: 0,
          events: [] as EventItem[],
        }
      : null;
  }, [segments, selectedDate, selectedCamera]);

  useEffect(() => {
    setCurrentMinute(0);
    setIsPlaying(false);
  }, [selectedDate, selectedCamera]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentMinute(video.currentTime / 60);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [videoBlobUrl]);

  async function loadPlaybackSegments(date: string) {
    try {
      setLoadingSegments(true);
      setSegmentError("");
      setSegments([]);
      setSelectedSegment(null);

      const token = localStorage.getItem("access_token");

      if (!token) {
        setSegmentError("No access token found. Please log in first.");
        return;
      }

      const normalized = date.replaceAll("/", "-");
      const [year, month, day] = normalized.split("-").map(Number);

      const start = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
      const end = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

      const requestUrl = `${BASE_URL}/api/playback?end=${end}&start=${start}`;

      const res = await fetch(requestUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Playback request failed: ${res.status} ${errorText}`);
      }

      const data: PlaybackSegment[] = await res.json();
      const sorted = [...data].sort((a, b) => a.start_ts - b.start_ts);

      setSegments(sorted);
      setSelectedSegment(sorted.length > 0 ? sorted[0] : null);
    } catch (error) {
      console.error("loadPlaybackSegments error:", error);
      setSegmentError(
        error instanceof Error ? error.message : "Failed to load playback segments."
      );
      setSegments([]);
      setSelectedSegment(null);
    } finally {
      setLoadingSegments(false);
    }
  }

  async function loadVideoFromSegment(segment: PlaybackSegment) {
    try {
      setLoadingVideo(true);
      setVideoError("");

      const token = localStorage.getItem("access_token");
      if (!token) {
        setVideoError("No access token found. Please log in first.");
        return;
      }

      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
        setVideoBlobUrl(null);
      }

      const realUrl = segment.url.includes("%03d")
        ? segment.url.replace("%03d", "000")
        : segment.url;

      const res = await fetch(realUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Video request failed: ${res.status} ${errorText}`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setVideoBlobUrl(objectUrl);
    } catch (error) {
      console.error("loadVideoFromSegment error:", error);
      setVideoError(
        error instanceof Error
          ? error.message
          : "Failed to load video stream from backend URL."
      );
      setVideoBlobUrl(null);
    } finally {
      setLoadingVideo(false);
    }
  }

  function isWindowLoaded(start: number, end: number) {
    return loadedTrackWindowsRef.current.some(
      (w) => start >= w.start && end <= w.end
    );
  }

  function mergeLoadedWindow(start: number, end: number) {
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
  }

  function mergeTracks(existing: TrackItem[], incoming: TrackItem[]) {
    const map = new Map<string, TrackItem>();

    for (const item of existing) {
      const key = `${item.cow_id}_${item.timestamp}_${item.behavior}`;
      map.set(key, item);
    }

    for (const item of incoming) {
      const key = `${item.cow_id}_${item.timestamp}_${item.behavior}`;
      map.set(key, item);
    }

    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  async function loadTracksForWindow(windowStart: number, windowEnd: number) {
    try {
      if (loadingTrackWindowRef.current) return;
      if (isWindowLoaded(windowStart, windowEnd)) return;

      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("No access token found for tracks.");
        return;
      }

      loadingTrackWindowRef.current = true;

      const requestBody = {
        and: [
          { ">=": [{ var: "timestamp" }, windowStart] },
          { "<=": [{ var: "timestamp" }, windowEnd] },
        ],
      };

      const res = await fetch(`${BASE_URL}/api/tracks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Tracks request failed: ${res.status} ${errorText}`);
      }

      const data: TrackItem[] = await res.json();

      setTracks((prev) => mergeTracks(prev, data));
      mergeLoadedWindow(windowStart, windowEnd);
    } catch (error) {
      console.error("loadTracksForWindow error:", error);
    } finally {
      loadingTrackWindowRef.current = false;
    }
  }

  function drawTracks() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const segment = selectedSegment;

    if (!video || !canvas || !segment) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const wrapper = wrapperRef.current;
    const rect = (wrapper ?? video).getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const BBOX_TIME_OFFSET_MS = 5300;
    const currentAbsTs =
      segment.start_ts + video.currentTime * 1000 + BBOX_TIME_OFFSET_MS;

    const groupedTracks = new Map<string, TrackItem[]>();

    for (const item of tracks) {
      if (!Array.isArray(item.bbox) || item.bbox.length < 4) continue;

      if (!groupedTracks.has(item.cow_id)) {
        groupedTracks.set(item.cow_id, []);
      }
      groupedTracks.get(item.cow_id)!.push(item);
    }

    const currentTracks: TrackItem[] = [];

    for (const [, cowTracks] of groupedTracks.entries()) {
      cowTracks.sort((a, b) => a.timestamp - b.timestamp);

      let prev: TrackItem | null = null;
      let next: TrackItem | null = null;

      for (const track of cowTracks) {
        if (track.timestamp <= currentAbsTs) {
          prev = track;
        }
        if (track.timestamp >= currentAbsTs) {
          next = track;
          break;
        }
      }

      const MAX_GAP_MS = 3000;

      if (prev && next) {
        const prevDiff = currentAbsTs - prev.timestamp;
        const nextDiff = next.timestamp - currentAbsTs;

        if (prevDiff <= MAX_GAP_MS && nextDiff <= MAX_GAP_MS) {
          if (prev.timestamp === next.timestamp) {
            currentTracks.push(prev);
          } else {
            const t =
              (currentAbsTs - prev.timestamp) /
              (next.timestamp - prev.timestamp);

            currentTracks.push({
              ...prev,
              bbox: interpolateBox(
                prev.bbox.map(Number),
                next.bbox.map(Number),
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

    const videoWidth = video.videoWidth || rect.width;
    const videoHeight = video.videoHeight || rect.height;

    const containerWidth = rect.width;
    const containerHeight = rect.height;

    const videoAspect = videoWidth / videoHeight;
    const containerAspect = containerWidth / containerHeight;

    let renderWidth = 0;
    let renderHeight = 0;
    let offsetX = 0;
    let offsetY = 0;

    if (videoAspect > containerAspect) {
      renderWidth = containerWidth;
      renderHeight = containerWidth / videoAspect;
      offsetX = 0;
      offsetY = (containerHeight - renderHeight) / 2;
    } else {
      renderHeight = containerHeight;
      renderWidth = containerHeight * videoAspect;
      offsetY = 0;
      offsetX = (containerWidth - renderWidth) / 2;
    }

    const scaleX = renderWidth / videoWidth;
    const scaleY = renderHeight / videoHeight;

    for (const item of currentTracks) {
      const box = item.bbox;
      if (!Array.isArray(box) || box.length < 4) continue;

      const [x, y, w, h] = box.map(Number);

      const drawX = offsetX + x * scaleX;
      const drawY = offsetY + y * scaleY;
      const drawW = w * scaleX;
      const drawH = h * scaleY;

      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 1;
      ctx.strokeRect(drawX, drawY, drawW, drawH);

      //const label = `${item.cow_id}`;
      const label = `${item.cow_id} ${formatBehaviorLabel(item.behavior)}`;
      ctx.font = "11px Arial";
      const textWidth = ctx.measureText(label).width;
      const textHeight = 14;

      ctx.fillStyle = "rgba(34, 197, 94, 0.9)";
      ctx.fillRect(
        drawX,
        Math.max(0, drawY - textHeight),
        textWidth + 8,
        textHeight
      );

      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, drawX + 4, Math.max(11, drawY - 3));
    }
  }

  useEffect(() => {
    loadPlaybackSegments(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (selectedSegment) {
      setTracks([]);
      loadedTrackWindowsRef.current = [];
      loadVideoFromSegment(selectedSegment);
    } else {
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
      }
      setVideoBlobUrl(null);
      setVideoError("");
      setTracks([]);
      loadedTrackWindowsRef.current = [];
    }

    return () => {
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSegment]);

  useEffect(() => {
    const video = videoRef.current;
    const segment = selectedSegment;
    if (!video || !segment) return;

    let lastRequestedBucket = -1;

    const checkAndLoad = () => {
      const currentAbsTs = segment.start_ts + video.currentTime * 1000;

      const PRELOAD_BEFORE_MS = 5000;
      const PRELOAD_AFTER_MS = 15000;
      const bucketSizeMs = 5000;

      const bucket = Math.floor(currentAbsTs / bucketSizeMs);
      if (bucket === lastRequestedBucket) return;
      lastRequestedBucket = bucket;

      const windowStart = Math.max(
        segment.start_ts,
        currentAbsTs - PRELOAD_BEFORE_MS
      );
      const windowEnd = Math.min(
        segment.end_ts,
        currentAbsTs + PRELOAD_AFTER_MS
      );

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
  }, [selectedSegment, videoBlobUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoBlobUrl) return;

    let rafId: number | null = null;

    const redraw = () => {
      drawTracks();
    };

    const startLoop = () => {
      if (rafId !== null) return;

      const loop = () => {
        drawTracks();
        rafId = requestAnimationFrame(loop);
      };

      rafId = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    video.addEventListener("play", startLoop);
    video.addEventListener("pause", stopLoop);
    video.addEventListener("ended", stopLoop);

    video.addEventListener("seeked", redraw);
    video.addEventListener("loadeddata", redraw);
    video.addEventListener("loadedmetadata", redraw);

    window.addEventListener("resize", redraw);
    document.addEventListener("fullscreenchange", redraw);

    if (!video.paused && !video.ended) {
      startLoop();
    } else {
      redraw();
    }

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
  }, [videoBlobUrl, tracks, selectedSegment]);

  const upcomingEvents = useMemo(() => {
    return [];
  }, []);

  const activeWindowEvents = useMemo(() => {
    return upcomingEvents.filter(
      (event) => Math.abs(event.minute - currentMinute) <= 18
    );
  }, [upcomingEvents, currentMinute]);

  const currentEvent = useMemo(() => {
    const reversed = [...upcomingEvents].reverse();
    return reversed.find((event) => event.minute <= currentMinute) || null;
  }, [upcomingEvents, currentMinute]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Cowputer Vision</div>
          <h1 style={styles.title}>Playback Center</h1>
          <p style={styles.subtitle}>
            Review historical barn footage and play backend playback segments directly.
          </p>
        </div>

        <div style={styles.headerActions}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Camera</label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              style={styles.input}
            >
              {cameras.map((camera) => (
                <option key={camera} value={camera}>
                  {camera}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Action</label>
            <button
              onClick={() => loadPlaybackSegments(selectedDate)}
              style={styles.primaryButton}
            >
              Reload Segments
            </button>
          </div>
        </div>
      </div>

      {loadingSegments ? (
        <div style={styles.emptyState}>
          <h2 style={{ marginBottom: 8 }}>Loading...</h2>
          <p style={{ color: "#6b7280" }}>Loading playback segments.</p>
        </div>
      ) : segmentError ? (
        <div style={styles.emptyState}>
          <h2 style={{ marginBottom: 8 }}>Error</h2>
          <p style={{ color: "#ef4444" }}>{segmentError}</p>
        </div>
      ) : segments.length === 0 ? (
        <div style={styles.emptyState}>
          <h2 style={{ marginBottom: 8 }}>No playback found</h2>
          <p style={{ color: "#6b7280" }}>
            No recording is available for this date and camera combination.
          </p>
        </div>
      ) : (
        <>
          <div style={styles.statsRow}>
            <StatCard
              title="Recording Date"
              value={currentSession?.date ?? selectedDate}
              sub="Selected day"
            />
            <StatCard
              title="Camera"
              value={currentSession?.camera ?? selectedCamera}
              sub="Frontend selection"
            />
            <StatCard
              title="Segments"
              value={String(segments.length)}
              sub="Returned by backend"
            />
            <StatCard
              title="Video Status"
              value={
                loadingVideo
                  ? "Loading"
                  : videoError
                  ? "Error"
                  : videoBlobUrl
                  ? "Ready"
                  : "Idle"
              }
              sub="Playback stream"
            />
          </div>

          <div style={styles.mainGrid}>
            <div style={styles.videoPanel}>
              <div style={styles.videoTopBar}>
                <div>
                  <div style={styles.videoTitle}>Playback Viewer</div>
                  <div style={styles.videoMeta}>
                    {selectedCamera} · {selectedDate}
                  </div>
                </div>
                <div style={styles.liveBadge}>Backend Connected</div>
              </div>

              <div style={styles.videoArea}>
                <div style={styles.videoOverlayTop}>
                  <span>
                    Current Time:{" "}
                    {videoRef.current
                      ? formatVideoTime(videoRef.current.currentTime)
                      : "0:00"}
                  </span>
                  <span>Selected Date: {selectedDate}</span>
                </div>

                <div style={styles.videoPlaceholder}>
                  {loadingSegments ? (
                    <div style={styles.videoCenterText}>
                      <div style={styles.playbackBigText}>Loading...</div>
                      <div style={styles.videoPlaceholderText}>
                        Loading playback segments
                      </div>
                    </div>
                  ) : segmentError ? (
                    <div style={styles.videoCenterText}>
                      <div style={styles.playbackBigText}>Error</div>
                      <div style={{ color: "#ef4444", marginTop: 8 }}>
                        {segmentError}
                      </div>
                    </div>
                  ) : loadingVideo ? (
                    <div style={styles.videoCenterText}>
                      <div style={styles.playbackBigText}>Loading Video...</div>
                      <div style={styles.videoPlaceholderText}>
                        Fetching protected video stream with token
                      </div>
                    </div>
                  ) : videoError ? (
                    <div style={styles.videoCenterText}>
                      <div style={styles.playbackBigText}>Video Error</div>
                      <div style={{ color: "#ef4444", marginTop: 8 }}>
                        {videoError}
                      </div>
                    </div>
                  ) : videoBlobUrl ? (
                    <div ref={wrapperRef} style={styles.videoPlayerWrap}>
                      <video
                        ref={videoRef}
                        controls
                        style={styles.videoElement}
                        src={videoBlobUrl ?? undefined}
                      />

                      <canvas ref={canvasRef} style={styles.canvasOverlay} />
                    </div>
                  ) : selectedSegment ? (
                    <div style={styles.videoCenterText}>
                      <div style={styles.playbackBigText}>Segment Ready</div>
                      <div style={styles.videoPlaceholderText}>
                        {selectedSegment.filename}
                      </div>
                      <div style={styles.videoPlaceholderSubText}>
                        Select or reload a segment to try playback.
                      </div>
                    </div>
                  ) : (
                    <div style={styles.videoCenterText}>
                      <div style={styles.playbackBigText}>No Video</div>
                      <div style={styles.videoPlaceholderText}>
                        No playback segment found
                      </div>
                      <div style={styles.videoPlaceholderSubText}>
                        Try another date or check backend data range.
                      </div>
                    </div>
                  )}
                </div>

                <div style={styles.videoOverlayBottom}>
                  <span>Segment: {selectedSegment ? selectedSegment.id : "None"}</span>
                </div>
              </div>

              <div style={styles.controlsSection}>
                <div style={styles.timelineHeader}>
                  <span style={{ fontWeight: 600 }}>Timeline</span>
                  <span style={{ color: "#6b7280" }}>
                    {videoRef.current
                      ? formatVideoTime(videoRef.current.currentTime)
                      : "0:00"}
                  </span>
                </div>

                <div style={styles.timelineWrap}>
                  <input
                    type="range"
                    min={0}
                    max={videoRef.current?.duration || 0}
                    value={videoRef.current?.currentTime || 0}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (videoRef.current) {
                        videoRef.current.currentTime = value;
                      }
                    }}
                    style={styles.range}
                  />
                  <div style={styles.timelineMarkers}>
                    {(currentSession?.events ?? []).map((event) => (
                      <div
                        key={event.id}
                        title={`${event.time} · ${event.behavior} · ${event.cowId}`}
                        style={{
                          ...styles.timelineMarker,
                          left: `${
                            (event.minute / (currentSession?.durationMinutes ?? 1440)) * 100
                          }%`,
                          backgroundColor: severityColor(event.severity),
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={styles.buttonRow}>
                  <button
                    onClick={() => {
                      if (!videoRef.current) return;

                      if (videoRef.current.paused) {
                        videoRef.current.play().catch(() => {});
                      } else {
                        videoRef.current.pause();
                      }
                    }}
                    style={{ ...styles.primaryButton, minWidth: 110 }}
                  >
                    {isPlaying ? "Pause" : "Play"}
                  </button>

                  <button
                    onClick={() => {
                      if (!videoRef.current) return;
                      videoRef.current.currentTime = 0;
                      videoRef.current.pause();
                    }}
                    style={styles.secondaryButton}
                  >
                    Restart
                  </button>

                  <button
                    onClick={() => {
                      if (!videoRef.current) return;
                      videoRef.current.currentTime = Math.max(
                        0,
                        videoRef.current.currentTime - 10
                      );
                    }}
                    style={styles.secondaryButton}
                  >
                    -10 sec
                  </button>

                  <button
                    onClick={() => {
                      if (!videoRef.current) return;
                      const duration = videoRef.current.duration || 0;
                      videoRef.current.currentTime = Math.min(
                        duration,
                        videoRef.current.currentTime + 10
                      );
                    }}
                    style={styles.secondaryButton}
                  >
                    +10 sec
                  </button>

                  <button
                    onClick={() => {
                      if (!wrapperRef.current) return;

                      if (document.fullscreenElement) {
                        document.exitFullscreen().catch(() => {});
                      } else {
                        wrapperRef.current.requestFullscreen().catch(() => {});
                      }
                    }}
                    style={styles.secondaryButton}
                  >
                    Fullscreen
                  </button>

                  <div style={styles.speedGroup}>
                    {speeds.map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          setSpeed(item);
                          if (videoRef.current) {
                            videoRef.current.playbackRate = item;
                          }
                        }}
                        style={{
                          ...styles.speedButton,
                          background: speed === item ? "#16a34a" : "#ffffff",
                          color: speed === item ? "#ffffff" : "#111827",
                          borderColor: speed === item ? "#16a34a" : "#d1d5db",
                        }}
                      >
                        {item}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.sidePanel}>
              <div style={styles.sideCard}>
                <div style={styles.sideCardTitle}>Available Segments</div>

                {segments.length === 0 ? (
                  <div style={styles.noEvent}>
                    No playback segments for this date.
                  </div>
                ) : (
                  <div style={styles.eventList}>
                    {segments.map((segment) => (
                      <div
                        key={segment.id}
                        onClick={() => setSelectedSegment(segment)}
                        style={{
                          ...styles.eventItem,
                          cursor: "pointer",
                          background:
                            selectedSegment?.id === segment.id
                              ? "#f0fdf4"
                              : "transparent",
                          borderRadius: 8,
                          paddingLeft: 10,
                          paddingRight: 10,
                        }}
                      >
                        <div
                          style={{
                            ...styles.eventDot,
                            backgroundColor:
                              selectedSegment?.id === segment.id
                                ? "#16a34a"
                                : "#9ca3af",
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={styles.eventMainLine}>
                            <span>{segment.filename}</span>
                          </div>
                          <div style={styles.eventSubLine}>
                            {formatTimestamp(segment.start_ts)} →{" "}
                            {formatTimestamp(segment.end_ts)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.sideCard}>
                <div style={styles.sideCardTitle}>Selected Segment Detail</div>

                {selectedSegment ? (
                  <>
                    <div style={styles.snapshotItem}>
                      <span style={styles.snapshotLabel}>Segment ID</span>
                      <span style={styles.snapshotValue}>{selectedSegment.id}</span>
                    </div>
                    <div style={styles.snapshotItem}>
                      <span style={styles.snapshotLabel}>Filename</span>
                      <span style={styles.snapshotValue}>
                        {selectedSegment.filename}
                      </span>
                    </div>
                    <div style={styles.snapshotItem}>
                      <span style={styles.snapshotLabel}>Start</span>
                      <span style={styles.snapshotValue}>
                        {formatTimestamp(selectedSegment.start_ts)}
                      </span>
                    </div>
                    <div style={styles.snapshotItem}>
                      <span style={styles.snapshotLabel}>End</span>
                      <span style={styles.snapshotValue}>
                        {formatTimestamp(selectedSegment.end_ts)}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 16,
                        padding: 12,
                        borderRadius: 8,
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        wordBreak: "break-all",
                        fontSize: 13,
                        color: "#374151",
                      }}
                    >
                      <strong>Returned URL:</strong>
                      <div style={{ marginTop: 8 }}>{selectedSegment.url}</div>
                    </div>
                  </>
                ) : (
                  <div style={styles.noEvent}>No segment selected.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{title}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statSub}>{sub}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f6f7f9",
    color: "#111827",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  kicker: {
    fontSize: 13,
    color: "#16a34a",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: 32,
    lineHeight: 1.1,
    fontWeight: 700,
    color: "#111827",
  },
  subtitle: {
    marginTop: 10,
    color: "#6b7280",
    maxWidth: 760,
    fontSize: 14,
  },
  headerActions: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: "#374151",
    fontWeight: 600,
  },
  input: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    minWidth: 190,
    outline: "none",
  },
  emptyState: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#ffffff",
    padding: 32,
    marginTop: 20,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 18,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  statTitle: {
    color: "#6b7280",
    fontSize: 13,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 6,
    color: "#111827",
  },
  statSub: {
    color: "#9ca3af",
    fontSize: 13,
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 0.95fr)",
    gap: 20,
    alignItems: "start",
  },
  videoPanel: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  videoTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #e5e7eb",
    background: "#ffffff",
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
  },
  videoMeta: {
    color: "#6b7280",
    marginTop: 6,
    fontSize: 13,
  },
  liveBadge: {
    background: "#dcfce7",
    color: "#15803d",
    border: "1px solid #bbf7d0",
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
  },
  videoArea: {
    padding: 20,
    background: "#ffffff",
  },
  videoOverlayTop: {
    display: "flex",
    justifyContent: "space-between",
    color: "#6b7280",
    fontSize: 13,
    marginBottom: 12,
    gap: 12,
    flexWrap: "wrap",
  },
  videoPlaceholder: {
    width: "100%",
    aspectRatio: "16 / 9",
    minHeight: 360,
    borderRadius: 10,
    background: "#111827",
    border: "1px solid #d1d5db",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  videoPlayerWrap: {
    width: "100%",
    height: "100%",
    position: "relative",
    background: "#000000",
    overflow: "hidden",
  },
  videoElement: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    background: "#000000",
  },
  canvasOverlay: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  },
  videoCenterText: {
    textAlign: "center",
    zIndex: 2,
    padding: "0 20px",
  },
  playbackBigText: {
    fontSize: 40,
    fontWeight: 700,
    color: "#f9fafb",
    letterSpacing: 1,
  },
  videoPlaceholderText: {
    color: "#e5e7eb",
    marginTop: 8,
  },
  videoPlaceholderSubText: {
    color: "#9ca3af",
    marginTop: 6,
    fontSize: 14,
  },
  videoOverlayBottom: {
    display: "flex",
    justifyContent: "space-between",
    color: "#6b7280",
    fontSize: 13,
    marginTop: 12,
    gap: 12,
    flexWrap: "wrap",
  },
  controlsSection: {
    borderTop: "1px solid #e5e7eb",
    padding: 20,
    background: "#ffffff",
  },
  timelineHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  timelineWrap: {
    position: "relative",
    marginBottom: 18,
  },
  range: {
    width: "100%",
  },
  timelineMarkers: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    pointerEvents: "none",
  },
  timelineMarker: {
    position: "absolute",
    top: "50%",
    width: 8,
    height: 8,
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
  },
  buttonRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  primaryButton: {
    border: "none",
    background: "#16a34a",
    color: "#ffffff",
    borderRadius: 8,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    borderRadius: 8,
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  speedGroup: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginLeft: 4,
  },
  speedButton: {
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    borderRadius: 8,
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  sidePanel: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  sideCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  sideCardTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 14,
  },
  eventList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  eventItem: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    paddingTop: 6,
    paddingBottom: 6,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    marginTop: 6,
    flexShrink: 0,
  },
  eventMainLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
  },
  eventSubLine: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 4,
  },
  eventTime: {
    color: "#6b7280",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  noEvent: {
    color: "#6b7280",
    fontSize: 14,
  },
  snapshotItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  snapshotLabel: {
    color: "#6b7280",
    fontSize: 13,
  },
  snapshotValue: {
    color: "#111827",
    fontSize: 13,
    fontWeight: 600,
    textAlign: "right",
  },
};


