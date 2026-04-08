import os
from pathlib import Path

import cv2
import numpy as np
import yaml as yamllib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.metrics import roc_curve, auc
from ultralytics import YOLO

MODEL_PATH = "/u50/zhanb50/Ws_prog/Cowputer/yolov12/runs/train/exp10/weights/best.pt"
DATA_YAML  = "/u50/zhanb50/Ws_prog/Cowputer/Data/MmCows_cropbox/mmcows_behavior_det.yaml"
IMAGES_DIR = "/u50/zhanb50/Ws_prog/Cowputer/Data/MmCows_cropbox/images/test"
LABELS_DIR = "/u50/zhanb50/Ws_prog/Cowputer/Data/MmCows_cropbox/labels/test"
OUT_DIR    = "/u50/zhanb50/Ws_prog/Cowputer/yolov12/final_test_VV/runs/component2_behaviour"

IOU_THRESH = 0.51
DEVICE     = 0

os.makedirs(OUT_DIR, exist_ok=True)


def iou(a, b) -> float:
    xa1, ya1 = max(a[0], b[0]), max(a[1], b[1])
    xa2, ya2 = min(a[2], b[2]), min(a[3], b[3])
    iw, ih   = max(0.0, xa2 - xa1), max(0.0, ya2 - ya1)
    inter    = iw * ih
    ua       = (a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1]) - inter
    return inter / ua if ua > 0 else 0.0


def build_temp_yaml(original_yaml: str, images_dir: str, out_dir: str) -> str:
    with open(original_yaml) as f:
        base = yamllib.safe_load(f)

    cfg = {
        "path":  "/",
        "train": images_dir,
        "val":   images_dir,
        "names": base["names"],
    }
    if "nc" in base:
        cfg["nc"] = base["nc"]

    temp_path = os.path.join(out_dir, "_test_as_val.yaml")
    with open(temp_path, "w") as f:
        yamllib.dump(cfg, f, sort_keys=False)
    return temp_path


def main():
    model = YOLO(MODEL_PATH)
    names = model.names
    num_classes = len(names)
    print(f"[Component 2] Classes ({num_classes}): {list(names.values())}")

    temp_yaml = build_temp_yaml(DATA_YAML, IMAGES_DIR, OUT_DIR)
    print("Running model.val() ...")
    metrics = model.val(
        data     = temp_yaml,
        device   = DEVICE,
        plots    = True,
        save_json= False,
        project  = OUT_DIR,
        name     = "ultralytics_val",
        verbose  = False,
    )

    p_per  = np.array(metrics.box.p, dtype=float)
    r_per  = np.array(metrics.box.r, dtype=float)
    f1_per = 2 * p_per * r_per / (p_per + r_per + 1e-16)

    lines = [
        "Component 2: Behaviour Classification",
        "=" * 55,
        f"Model       : {MODEL_PATH}",
        f"Classes     : {list(names.values())}",
        "",
        f"{'class':<22}{'P':>10}{'R':>10}{'F1':>10}",
    ]
    for i in range(num_classes):
        if i < len(p_per):
            cname = names[i] if i in names else str(i)
            lines.append(f"{cname:<22}{p_per[i]:>10.4f}{r_per[i]:>10.4f}{f1_per[i]:>10.4f}")
    lines += [
        "",
        f"mean Precision : {p_per.mean():.4f}",
        f"mean Recall    : {r_per.mean():.4f}",
        f"mean F1        : {f1_per.mean():.4f}",
        "",
        "(Confusion matrix PNG saved under ultralytics_val/)",
        "",
    ]

    print("Computing ROC-AUC ...")
    image_files = sorted(
        p for p in Path(IMAGES_DIR).iterdir()
        if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp")
    )

    y_true_list  = []
    y_score_list = []

    for idx, img_path in enumerate(image_files):
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        h, w = img.shape[:2]

        lp = Path(LABELS_DIR) / (img_path.stem + ".txt")
        gts = []
        if lp.exists():
            with open(lp) as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) < 5:
                        continue
                    cls = int(parts[0])
                    cx, cy, bw, bh = map(float, parts[1:5])
                    box = [(cx-bw/2)*w, (cy-bh/2)*h,
                           (cx+bw/2)*w, (cy+bh/2)*h]
                    gts.append((cls, box))
        if not gts:
            continue

        res = model.predict(
            source=str(img_path), conf=0.001,
            device=DEVICE, verbose=False,
        )[0]

        preds = []
        if res.boxes is not None and len(res.boxes) > 0:
            xyxy  = res.boxes.xyxy.cpu().numpy()
            confs = res.boxes.conf.cpu().numpy()
            clses = res.boxes.cls.cpu().numpy().astype(int)
            preds = list(zip(xyxy.tolist(),
                             confs.tolist(),
                             clses.tolist()))

        for gt_cls, gt_box in gts:
            best_iou, best_pred = 0.0, None
            for pb, pc, pk in preds:
                cur = iou(gt_box, pb)
                if cur > best_iou:
                    best_iou, best_pred = cur, (pc, pk)

            score_vec = np.zeros(num_classes, dtype=np.float32)
            if best_pred is not None and best_iou >= IOU_THRESH:
                pc, pk = best_pred
                if 0 <= pk < num_classes:
                    score_vec[pk] = pc

            y_true_list.append(gt_cls)
            y_score_list.append(score_vec)

        if (idx + 1) % 50 == 0:
            print(f"  processed {idx+1}/{len(image_files)}")

    y_true  = np.array(y_true_list)
    y_score = np.array(y_score_list)

    lines.append("ROC-AUC (one-vs-rest):")
    plt.figure(figsize=(8, 6))
    for k in range(num_classes):
        cname = names[k] if k in names else str(k)
        y_bin = (y_true == k).astype(int)
        if y_bin.sum() == 0 or y_bin.sum() == len(y_bin):
            lines.append(f"  {cname}: N/A (no positives or no negatives)")
            continue
        fpr, tpr, _ = roc_curve(y_bin, y_score[:, k])
        roc_auc     = auc(fpr, tpr)
        lines.append(f"  {cname}: AUC = {roc_auc:.4f}")
        plt.plot(fpr, tpr, label=f"{cname} (AUC={roc_auc:.3f})")

    plt.plot([0, 1], [0, 1], "k--", alpha=0.5)
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve per Behaviour (one-vs-rest)")
    plt.legend(loc="lower right", fontsize=8)
    plt.tight_layout()
    roc_png = os.path.join(OUT_DIR, "roc_curves.png")
    plt.savefig(roc_png, dpi=150)
    plt.close()

    report = "\n".join(lines)
    print("\n" + report)

    with open(os.path.join(OUT_DIR, "results.txt"), "w") as f:
        f.write(report)
    print(f"\nSaved -> {OUT_DIR}")
    print(f"  - results.txt")
    print(f"  - roc_curves.png")
    print(f"  - ultralytics_val/confusion_matrix.png  (+ _normalized)")


if __name__ == "__main__":
    main()
