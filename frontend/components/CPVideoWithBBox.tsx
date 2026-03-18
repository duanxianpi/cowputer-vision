"use client";

import { useRef, useState } from "react";
import { useHLSTrackSync } from "@/hooks/hls-sync";

interface Props {
  streamUrl: string;
  activeBehaviors?: string[];
  offsetMs?: number;
}

export default function CPVideoWithBBox({ streamUrl, activeBehaviors = [], offsetMs = 0 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useHLSTrackSync({
    videoRef,
    canvasRef,
    streamUrl,
    offsetMs,
    activeBehaviors
  });

  return (
    <>
      <div className="relative w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden border-2 border-gray-800 shadow-lg">
        <video 
          ref={videoRef} 
          className="w-full h-full object-fill block" 
          controls 
          muted 
        />
        <canvas 
          ref={canvasRef} 
          className="absolute top-0 left-0 w-full h-full pointer-events-none" 
        />
      </div>
    </>
  );
}