let ws: WebSocket | null = null;
let connected = false;
let connectingPromise: Promise<void> | null = null;

let frameCount = 0;
let lastTimestamp = performance.now();
let fps = 0;

const frameSubscribers = new Set<(jpeg: Uint8Array) => void>();
const metadataSubscribers = new Set<(metadata: any) => void>();
const allSubscribers = new Set<(jpeg: Uint8Array, metadata: any) => void>();

async function decompressGzip(arrayBuffer: ArrayBuffer): Promise<Uint8Array> {
  const ds = new DecompressionStream("gzip");
  const decompressed = new Response(arrayBuffer).body?.pipeThrough(ds);
  return new Uint8Array(await new Response(decompressed).arrayBuffer());
}

function parseCustomFormat(data: Uint8Array) {
  const view = new DataView(data.buffer);
  const metadataLength = view.getUint32(0, true);
  const metadataBytes = data.slice(4, 4 + metadataLength);

  const metadata = JSON.parse(new TextDecoder().decode(metadataBytes));
  const jpegData = data.slice(4 + metadataLength);

  return { metadata, jpegData };
}

function updateFPS() {
  frameCount++;

  const now = performance.now();
  const diff = now - lastTimestamp;

  if (diff >= 1000) {  // Every 1 second
    fps = (frameCount / diff) * 1000; // frames / second
    frameCount = 0;
    lastTimestamp = now;
  }

  return fps;
}

export function connectLiveCameraWS() {
  // return early if already connected
  if (connected) return Promise.resolve();
  // return early if connection is in progress
  if (connectingPromise) return connectingPromise;

  // atomic connection initiation
  connectingPromise = new Promise((resolve) => {
    console.log("[WS] Connecting...");

    // ws = new WebSocket("ws://localhost:8000");
    const ws = new WebSocket("ws://susan-ethics-dog-graphic.trycloudflare.com/ws/bbox");
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      console.log("[WS] Connected");
      connected = true;
      resolve();
      connectingPromise = null;
    };

    ws.onmessage = async (event) => {
      const decompressed = await decompressGzip(event.data);
      const { metadata, jpegData } = parseCustomFormat(decompressed);

      updateFPS();
      metadata.fps = fps;
      
      frameSubscribers.forEach((cb) => cb(jpegData));
      metadataSubscribers.forEach((cb) => cb(metadata));
      allSubscribers.forEach((cb) => cb(jpegData, metadata));
    };

    ws.onclose = () => {
      console.log("[WS] Closed. Reconnecting...");
      connected = false;

      // Clear promise lock
      connectingPromise = null;

      // Auto reconnect after 1 sec
      setTimeout(connectLiveCameraWS, 1000);
    };
  });

  return connectingPromise;
}

// JPEG frames
export function subscribeFrame(cb: (jpeg: Uint8Array) => void) {
  frameSubscribers.add(cb);
  connectLiveCameraWS();
  return () => frameSubscribers.delete(cb);
}

// Metadata only
export function subscribeMetadata(cb: (metadata: any[]) => void) {
  metadataSubscribers.add(cb);
  connectLiveCameraWS();
  return () => metadataSubscribers.delete(cb);
}

// Both JPEG frames and metadata
export function subscribeAll(cb: (jpeg: Uint8Array, metadata: any) => void) {
  allSubscribers.add(cb);
  connectLiveCameraWS();
  return () => allSubscribers.delete(cb);
}
