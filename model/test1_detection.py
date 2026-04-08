import os
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

MODEL_PATH = "/u50/zhanb50/Ws_prog/Cowputer/yolov12/runs/train/exp10/weights/best.pt"
IMAGES_DIR = "/u50/zhanb50/Ws_prog/Cowputer/Data/MmCows_cropbox/images/test"
LABELS_DIR = "/u50/zhanb50/Ws_prog/Cowputer/Data/MmCows_cropbox/labels/test"
OUT_DIR    = "/u50/zhanb50/Ws_prog/Cowputer/yolov12/final_test_VV/runs/component1_detection"

IOU_THRESH  = 0.51
CONF_THRESH = 0.51
DEVICE      = 0

os.makedirs(OUT_DIR, exist_ok=True)


def yolo_txt_to_xyxy(line: str, img_w: int, img_h: int):
    parts = line.strip().split()
    cx, cy, bw, bh = map(float, parts[1:5])
    x1 = (cx - bw / 2) * img_w
    y1 = (cy - bh / 2) * img_h
    x2 = (cx + bw / 2) * img_w
    y2 = (cy + bh / 2) * img_h
    return [x1, y1, x2, y2]


def iou(box_a, box_b) -> float:
    xa1 = max(box_a[0], box_b[0])
    ya1 = max(box_a[1], box_b[1])
    xa2 = min(box_a[2], box_b[2])
    ya2 = min(box_a[3], box_b[3])
    inter_w = max(0.0, xa2 - xa1)
    inter_h = max(0.0, ya2 - ya1)
    inter   = inter_w * inter_h
    area_a  = (box_a[2] - box_a[0]) * (box_a[3] - box_a[1])
    area_b  = (box_b[2] - box_b[0]) * (box_b[3] - box_b[1])
    union   = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def match_greedy(preds_sorted, gts, iou_thresh):
    matched_gt = set()
    matched_ious = []
    tp = 0
    for p in preds_sorted:
        best_iou, best_j = 0.0, -1
        for j, g in enumerate(gts):
            if j in matched_gt:
                continue
            cur = iou(p, g)
            if cur > best_iou:
                best_iou, best_j = cur, j
        if best_j >= 0 and best_iou >= iou_thresh:
            tp += 1
            matched_gt.add(best_j)
            matched_ious.append(best_iou)
    fp = len(preds_sorted) - tp
    fn = len(gts) - len(matched_gt)
    return matched_ious, tp, fp, fn


def main():
    model = YOLO(MODEL_PATH)

    image_files = sorted(
        p for p in Path(IMAGES_DIR).iterdir()
        if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp")
    )
    print(f"[Component 1] Found {len(image_files)} test images.")

    total_tp = total_fp = total_fn = 0
    all_matched_ious = []

    for i, img_path in enumerate(image_files):
        img = cv2.imread(str(img_path))
        if img is None:
            print(f"  WARN: cannot read {img_path}")
            continue
        h, w = img.shape[:2]

        label_path = Path(LABELS_DIR) / (img_path.stem + ".txt")
        gts = []
        if label_path.exists():
            with open(label_path) as f:
                for line in f:
                    if line.strip():
                        gts.append(yolo_txt_to_xyxy(line, w, h))

        res = model.predict(
            source=str(img_path),
            conf=CONF_THRESH,
            device=DEVICE,
            verbose=False,
        )[0]

        preds_sorted = []
        if res.boxes is not None and len(res.boxes) > 0:
            xyxy  = res.boxes.xyxy.cpu().numpy()
            confs = res.boxes.conf.cpu().numpy()
            order = np.argsort(-confs)
            preds_sorted = [xyxy[k].tolist() for k in order]

        m_ious, tp, fp, fn = match_greedy(preds_sorted, gts, IOU_THRESH)
        total_tp += tp
        total_fp += fp
        total_fn += fn
        all_matched_ious.extend(m_ious)

        if (i + 1) % 50 == 0:
            print(f"  processed {i+1}/{len(image_files)}")

    precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) else 0.0
    recall    = total_tp / (total_tp + total_fn) if (total_tp + total_fn) else 0.0
    mean_iou  = float(np.mean(all_matched_ious)) if all_matched_ious else 0.0

    report = (
        "Component 1: Detection (class-agnostic)\n"
        + "=" * 55 + "\n"
        f"Model          : {MODEL_PATH}\n"
        f"Images tested  : {len(image_files)}\n"
        f"IoU threshold  : {IOU_THRESH}\n"
        f"Conf threshold : {CONF_THRESH}\n\n"
        f"True  Positives : {total_tp}\n"
        f"False Positives : {total_fp}\n"
        f"False Negatives : {total_fn}\n\n"
        f"Precision          : {precision:.4f}\n"
        f"Recall             : {recall:.4f}\n"
        f"Mean IoU (matched) : {mean_iou:.4f}\n"
    )
    print("\n" + report)

    out_file = os.path.join(OUT_DIR, "results.txt")
    with open(out_file, "w") as f:
        f.write(report)
    print(f"Saved -> {out_file}")


if __name__ == "__main__":
    main()
