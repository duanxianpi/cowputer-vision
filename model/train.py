if __name__ == "__main__":
    from ultralytics import YOLO

    data_ymal = '/u50/zhanb50/Ws_prog/Cowputer/Data/MmCows_cropbox/mmcows_behavior_det.yaml'
    model = YOLO(r'/u50/zhanb50/Ws_prog/Cowputer/yolov12/yolo12m.pt')

    results = model.train(
        data=data_ymal,
        device='0,1,2,3',

        epochs=500,
        batch=128,
        imgsz=1024,

        workers=16,
        patience=50,

        optimizer='auto',
        cos_lr=True,

        rect=False,
        project='/u50/zhanb50/Ws_prog/Cowputer/yolov12/runs/train',
        name='exp'
    )

    metrics = model.val(
        data=data_ymal,

        rect=True,
        project='/u50/zhanb50/Ws_prog/Cowputer/yolov12/runs/val',
        name='exp'
    )

