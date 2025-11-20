from ultralytics import YOLO

if __name__ == "__main__":
    model = YOLO("/u50/zhanb50/Ws_prog/Cowputer/yolov12/runs/train/exp10/weights/best.pt")

    source = "/u50/zhanb50/Ws_prog/Cowputer/Data/MmCows_cropbox/images/test"

    results = model.predict(
        source=source,
        imgsz=1024,
        conf=0.25,
        device=0,
    
        project='/u50/zhanb50/Ws_prog/Cowputer/yolov12/runs',
        save=True,
    )
