# YOLO RTSP WebSocket Backend
This backend application uses FastAPI to serve a YOLO object detection model over RTSP and WebSocket protocols. It captures video frames from an RTSP stream, processes them using the YOLO model, and streams the frames with detected objects to connected WebSocket clients.

## Requirements
- Python 3.11

## Installation
### Set up a conda environment
```bash
conda create -n cowputer-vision python=3.11 -y
conda activate cowputer-vision
```

### Install dependencies
```bash
pip install -r requirements.txt
```

### Install sunsmarterjie's YOLO package
```bash
git clone https://github.com/sunsmarterjie/yolov12 sunsmarterjie-yolov12
cd sunsmarterjie-yolov12
pip install -e .
cd ..
```

## Running the Application
To start the FastAPI server, run the following command:
```bash
python main.py
```