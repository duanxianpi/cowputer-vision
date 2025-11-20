import os
import asyncio
import gzip
import json
import struct
import threading
import time
from contextlib import asynccontextmanager
from typing import Set

import cv2
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from ultralytics import YOLO

os.environ["OPENCV_FFMPEG_LOGLEVEL"] = "quiet"

RTSP_URL = "rtsp://127.0.0.1:8554/test"
MODEL_PATH = "bestV2.pt"

# Load the YOLO model once at startup
model = YOLO(MODEL_PATH)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager to handle startup and shutdown events.
    - Load the YOLO model
    - Start the inference thread
    """

    loop = asyncio.get_running_loop()
    t = threading.Thread(target=inference_loop, args=(loop,), daemon=True)
    t.start()
    print("[INFO] Inference thread created")
    try:
        yield
    finally:
        # Thread is daemonized, so no explicit join required, but hook left for future cleanup
        print("[INFO] Lifespan shutdown initiated")

app = FastAPI(title="RTSP + YOLO + WebSocket Demo", lifespan=lifespan)

class BroadcastManager:
    """
    Manage all WebSocket clients that subscribe to bbox streaming.
    Each client owns an asyncio.Queue that the inference thread fills with results.
    """

    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()
        self._lock = threading.Lock()

    def add_subscriber(self) -> asyncio.Queue:
        """Create and register a queue for every new WebSocket connection."""
        q: asyncio.Queue = asyncio.Queue()
        with self._lock:
            self._subscribers.add(q)
        return q

    def remove_subscriber(self, q: asyncio.Queue):
        """Remove the queue once the WebSocket disconnects."""
        with self._lock:
            self._subscribers.discard(q)

    async def _broadcast(self, data: bytes):
        """Broadcast coroutine that puts data into every subscriber queue."""
        with self._lock:
            queues = list(self._subscribers)

        # Push the message to every subscriber
        for q in queues:
            try:
                await q.put(data)
            except Exception:
                # Drop any queue that raises while sending
                self.remove_subscriber(q)

    def broadcast_from_thread(self, loop: asyncio.AbstractEventLoop, data: bytes):
        """
        Invoked from the non-async inference thread to schedule the broadcast task.
        """
        if loop.is_closed():
            return
        asyncio.run_coroutine_threadsafe(self._broadcast(data), loop)


broadcast_manager = BroadcastManager()


def inference_loop(loop: asyncio.AbstractEventLoop):
    """
    Inference loop that runs in a dedicated thread:
    - Pull frames from the RTSP stream
    - Run YOLO inference
    - Extract bbox information
    - Broadcast results to every WebSocket client
    """
    cap = cv2.VideoCapture(RTSP_URL)

    if not cap.isOpened():
        print(f"[ERROR] Failed to open RTSP stream: {RTSP_URL}")
        return

    print("[INFO] RTSP inference thread started")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[WARN] Failed to read RTSP frame, retrying...")
                cap = cv2.VideoCapture(RTSP_URL)
                time.sleep(0.1)
                continue

            # Run YOLO inference with verbose logging disabled
            results = model(frame, verbose=False)
            result = results[0]

            boxes_data = []
            boxes = result.boxes

            if boxes is not None and len(boxes) > 0:
                # Convert to numpy arrays for easier handling
                xyxy = boxes.xyxy.cpu().numpy()     # (N, 4)
                confs = boxes.conf.cpu().numpy()    # (N,)
                clses = boxes.cls.cpu().numpy().astype(int)  # (N,)

                for (x1, y1, x2, y2), conf, cls_id in zip(xyxy, confs, clses):
                    boxes_data.append(
                        {
                            "x1": float(x1),
                            "y1": float(y1),
                            "x2": float(x2),
                            "y2": float(y2),
                            "confidence": float(conf),
                            "class_id": int(cls_id),
                            "class_name": str(model.names.get(cls_id, "unknown")),
                        }
                    )

            metadata = {
                "timestamp": time.time(),
                "num_boxes": len(boxes_data),
                "boxes": boxes_data
            }

            metadata_json = json.dumps(metadata)
            metadata_bytes = metadata_json.encode('utf-8')

            # Construct the packet
            # First 4 bytes: length of metadata (little-endian)
            metadata_length = len(metadata_bytes)
            packet = struct.pack('<I', metadata_length)  # 4-byte unsigned int
            packet += metadata_bytes  # metadata
            
            ret, jpeg = cv2.imencode(".jpg", frame)
            jpeg_bytes = jpeg.tobytes() 
            
            packet += jpeg_bytes  # jpeg frame data

            # GZIP compression keeps the wire payload small
            compressed_packet = gzip.compress(packet)

            # Broadcast the results to every WebSocket client
            broadcast_manager.broadcast_from_thread(loop, compressed_packet)

            # Sleep a bit to avoid pegging the CPU;
            time.sleep(0.03)

    except Exception as e:
        print(f"[ERROR] Inference loop exception: {e}")
    finally:
        cap.release()
        print("[INFO] RTSP inference thread stopped")


@app.get("/")
async def root():
    return JSONResponse({"message": "RTSP YOLO WebSocket service running", "ws_endpoint": "/ws/bbox"})


@app.websocket("/ws/bbox")
async def websocket_bbox(websocket: WebSocket):
    """
    WebSocket endpoint:
    - Each client subscribes to its own queue after connecting
    - Continuously read bbox results from the queue and forward via send_bytes
    """
    await websocket.accept()
    queue = broadcast_manager.add_subscriber()
    print("[INFO] WebSocket client connected")

    try:
        while True:
            data = await queue.get()  # Wait for the next inference result
            await websocket.send_bytes(data)
    except WebSocketDisconnect:
        print("[INFO] WebSocket client disconnected")
    except Exception as e:
        print(f"[ERROR] WebSocket connection exception: {e}")
    finally:
        broadcast_manager.remove_subscriber(queue)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
