import os
import time

import cv2
from ultralytics import YOLO


MODEL_PATH = "/u50/zhanb50/Ws_prog/Cowputer/yolov12/runs/train/exp10/weights/best.pt"
VIDEO      = "/u50/zhanb50/Ws_prog/Cowputer/Data/TestVideo/t1.mp4"
OUT_DIR    = "/u50/zhanb50/Ws_prog/Cowputer/yolov12/final_test_VV/runs/component4_runtime"

K      = 5
DEVICE = 0

os.makedirs(OUT_DIR, exist_ok=True)


def load_all_frames(video_path: str):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")
    frames = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frames.append(frame)
    cap.release()
    return frames


def timed_run(model, frames):
    t0 = time.perf_counter()
    for f in frames:
        model.predict(source=f, device=DEVICE, verbose=False)
    t1 = time.perf_counter()
    return len(frames), t1 - t0


def main():
    model = YOLO(MODEL_PATH)

    print(f"[Component 4] Loading frames from: {VIDEO}")
    frames = load_all_frames(VIDEO)
    N = len(frames)
    print(f"  loaded {N} frames")

    print("Warmup ...")
    model.predict(source=frames[0], device=DEVICE, verbose=False)

    fps_list  = []
    time_list = []
    lines = [
        "Component 4: Runtime (FPS)",
        "=" * 55,
        f"Model   : {MODEL_PATH}",
        f"Video   : {VIDEO}",
        f"Frames  : {N}",
        f"Repeats : {K}",
        f"Device  : {DEVICE}",
        "",
    ]

    for i in range(K):
        n_frames, elapsed = timed_run(model, frames)
        fps = n_frames / elapsed if elapsed > 0 else 0.0
        fps_list.append(fps)
        time_list.append(elapsed)
        msg = f"Run {i+1}: frames={n_frames}  time={elapsed:.3f}s  FPS={fps:.2f}"
        print("  " + msg)
        lines.append(msg)

    avg_fps  = sum(fps_list)  / len(fps_list)
    avg_time = sum(time_list) / len(time_list)
    min_fps  = min(fps_list)
    max_fps  = max(fps_list)

    lines += [
        "",
        f"Average time : {avg_time:.3f} s",
        f"Average FPS  : {avg_fps:.2f}",
        f"Min FPS      : {min_fps:.2f}",
        f"Max FPS      : {max_fps:.2f}",
    ]

    report = "\n".join(lines)
    print("\n" + report)

    out_file = os.path.join(OUT_DIR, "results.txt")
    with open(out_file, "w") as f:
        f.write(report)
    print(f"\nSaved -> {out_file}")


if __name__ == "__main__":
    main()
