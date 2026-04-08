import os
from collections import Counter

from ultralytics import YOLO

MODEL_PATH = "/u50/zhanb50/Ws_prog/Cowputer/yolov12/runs/train/exp10/weights/best.pt"
VIDEO      = "/u50/zhanb50/Ws_prog/Cowputer/Data/TestVideo/t1.mp4"
OUT_DIR    = "/u50/zhanb50/Ws_prog/Cowputer/yolov12/final_test_VV/runs/component3_tracking"

GHOST_THRESH = 5
DEVICE       = 0

os.makedirs(OUT_DIR, exist_ok=True)


def main():
    model = YOLO(MODEL_PATH)
    print(f"[Component 3] Tracking video: {VIDEO}")

    track_frame_count = Counter()
    num_frames = 0

    results = model.track(
        source  = VIDEO,
        device  = DEVICE,
        stream  = True,
        persist = True,
        verbose = False,
    )

    for r in results:
        num_frames += 1
        if r.boxes is None or r.boxes.id is None:
            continue
        ids = r.boxes.id.int().cpu().tolist()
        for tid in ids:
            track_frame_count[tid] += 1

    total_tracks = len(track_frame_count)
    ghosts = {tid: c for tid, c in track_frame_count.items() if c <  GHOST_THRESH}
    normal = {tid: c for tid, c in track_frame_count.items() if c >= GHOST_THRESH}

    ghost_ratio = (len(ghosts) / total_tracks) if total_tracks else 0.0

    lines = [
        "Component 3: Tracking - Ghost Tracks",
        "=" * 55,
        f"Model          : {MODEL_PATH}",
        f"Video          : {VIDEO}",
        f"Frames seen    : {num_frames}",
        f"Total tracks   : {total_tracks}",
        f"Ghost threshold: < {GHOST_THRESH} frames",
        "",
        f"Ghost tracks   : {len(ghosts)}",
        f"Normal tracks  : {len(normal)}",
        f"Ghost ratio    : {ghost_ratio:.4f}",
        "",
        "--- Ghost track IDs and their frame counts ---",
    ]
    for tid, c in sorted(ghosts.items()):
        lines.append(f"  id={tid:<5}  frames={c}")
    lines.append("")
    lines.append("--- Normal track IDs and their frame counts ---")
    for tid, c in sorted(normal.items()):
        lines.append(f"  id={tid:<5}  frames={c}")

    report = "\n".join(lines)
    print("\n" + report)

    out_file = os.path.join(OUT_DIR, "results.txt")
    with open(out_file, "w") as f:
        f.write(report)
    print(f"\nSaved -> {out_file}")


if __name__ == "__main__":
    main()
