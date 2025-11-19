'use client';

import CPVideoWithBBox from "@/components/CPVideoWithBBox";
import { subscribeMetadata } from "@/services/live-camera";
import { Radio } from "lucide-react";
import { useEffect, useState } from "react";
import _ from "lodash";
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

type MetadataInfo = {
  fps: number;
  detected_objects: number;
  detected_behaviors: {};
} | null;

export default function LiveCameraPage() {
  const [info, setInfo] = useState<MetadataInfo>(null);

  useEffect(() => {
    const unsubscribe = subscribeMetadata((metadata) => {
      const info = handleMetadata(metadata);

      setInfo(info);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleMetadata = (metadata: any): MetadataInfo => {
    const counts: { [key: string]: number } = {};
    metadata.boxes.forEach((box: any) => {
      const label = box.class_name;
      if (counts[label]) {
        counts[label] += 1;
      } else {
        counts[label] = 1;
      }
    });
    const detected_behaviors = Object.keys(counts).map((key) => ({
      label: key,
      value: counts[key],
    }));

    return {
      fps: metadata.fps ?? 0,
      detected_objects: metadata.boxes.length ?? 0,
      detected_behaviors: detected_behaviors,
    };
  };

  return (
    <div className="flex flex-col">
      <div className="flex text-2xl font-semibold mb-4">
        Live Camera
        {info && (
          <>
            <span className="flex items-center px-2 ml-2 text-red-700 rounded-full bg-gray-200">
              <Radio size={24} strokeWidth={1.5} />
              <span className="ml-2 text-sm">LIVE</span>
            </span>
            <span className="flex items-center px-2 ml-2 rounded-full bg-gray-200">
              <span className="text-sm">FPS: {info.fps.toFixed(2)}</span>
            </span>
          </>
        )}
      </div>
      <div className="flex flex-row">
        <div className="flex justify-center min-w-150 bg-black rounded-lg grow aspect-video">
          <CPVideoWithBBox />
        </div>
        <div className="ml-4 p-4 border border-gray-300 rounded-lg w-80">
          <h2 className="text-xl font-semibold mb-2">Info</h2>
          <div className="flex flex-col space-y-4">
            {info === null ? (
              <Skeleton count={3} />
            ) : (
              <div className="flex">
                {Object.keys(info.detected_behaviors).length === 0 ? (
                  <span>None</span>
                ) : (
                  <ul className="list-disc list-inside">
                    {Object.values(info.detected_behaviors).map((behavior: any, index: number) => (
                      <li key={index}>
                        {_.upperFirst(behavior.label)}: {behavior.value}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}