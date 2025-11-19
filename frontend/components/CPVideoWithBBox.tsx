"use client";
import { useEffect, useRef } from "react";
import { subscribeAll } from "@/services/live-camera";

export default function CPVideoWithBBox() {
  type BBox = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    class_name: string;
    class_id: number;
    confidence: number;
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderFrameWithBBox = (jpegBytes: Uint8Array, bboxList: BBox[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const blob = new Blob([jpegBytes], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;

      const cssWidth = canvas.clientWidth;
      const cssHeight = cssWidth / aspectRatio;
    
      // Set internal resolution to match CSS size
      canvas.width = cssWidth;
      canvas.height = cssHeight;

      if (!ctx) return;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const scaleX = canvas.width / img.width;
      const scaleY = canvas.height / img.height;

      // Scale bounding boxes
      bboxList = bboxList.map((b) => ({
        ...b,
        x1: b.x1 * scaleX,
        y1: b.y1 * scaleY,
        x2: b.x2 * scaleX,
        y2: b.y2 * scaleY,
      }));

      // Draw bounding boxes
      bboxList.forEach((b) => {
        ctx.strokeStyle = "green";
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x1, b.y1, Math.abs(b.x1 - b.x2), Math.abs(b.y1 - b.y2));

        ctx.fillStyle = "green";
        ctx.font = "14px Inter";
        ctx.fillText(`${b.class_name}: ${b.confidence.toFixed(2)}`, b.x1, b.y1 - 5);
      });

      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      console.error("Failed to load image");
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }

  useEffect(() => {
    
    const unsubscribe = subscribeAll((jpegBytes, metadata) => {
      const bboxList: BBox[] = metadata.boxes || [];
      renderFrameWithBBox(jpegBytes, bboxList);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="w-full h-full flex justify-center ">
      <canvas className="rounded-lg w-full" ref={canvasRef} />
    </div>
  );
}