'use client';

import CPVideoWithBBox from "@/components/CPVideoWithBBox";
import { Radio } from "lucide-react";
import { useState, useMemo } from "react";
import CPStackAreaPlot from "@/components/visualizations/CPStackAreaPlot";
import { useTracks } from "@/hooks/track";

const AVAILABLE_BEHAVIORS = [
  { id: 'feeding_head_down', label: 'Feeding (Head Down)' },
  { id: 'feeding_head_up', label: 'Feeding (Head Up)' },
  { id: 'walking', label: 'Walking' },
  { id: 'standing', label: 'Standing' },
  { id: 'lying', label: 'Resting (Lying)' },
];

export default function LiveCameraPage() {
  const [activeBehaviors, setActiveBehaviors] = useState<string[]>(
    AVAILABLE_BEHAVIORS.map(b => b.id)
  );
  const [offsetMs, setOffsetMs] = useState(0);

  const { data, isLoading } = useTracks({
    behavior: ["feeding_head_down", "feeding_head_up", 'walking', 'standing', 'lying'],
    timeWindowMinutes: 5,
  });

  const toggleBehavior = (behaviorId: string) => {
    setActiveBehaviors(prev => 
      prev.includes(behaviorId) 
        ? prev.filter(id => id !== behaviorId) 
        : [...prev, behaviorId]
    );
  };

  const trendData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const timeGroups: Record<string, { feeding: number; walkingStanding: number; resting: number }> = {};

    data.forEach(t => {
      const ts = t.timestamp.toString();
      if (!timeGroups[ts]) {
        timeGroups[ts] = { feeding: 0, walkingStanding: 0, resting: 0 };
      }
      if (t.behavior === 'feeding_head_down' || t.behavior === 'feeding_head_up') timeGroups[ts].feeding++;
      else if (t.behavior === 'walking' || t.behavior === 'standing') timeGroups[ts].walkingStanding++;
      else if (t.behavior === 'lying') timeGroups[ts].resting++;
    });

    const sortedTimestamps = Object.keys(timeGroups).sort((a, b) => Number(a) - Number(b));

    const timeData = sortedTimestamps.map(ts => {
      const date = new Date(Number(ts)); 
      const hh = date.getHours().toString().padStart(2, '0');
      const mm = date.getMinutes().toString().padStart(2, '0');
      const ss = date.getSeconds().toString().padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    });

    const trendSeries = [
      { name: 'Feeding', type: 'line', stack: 'Total', areaStyle: {}, showSymbol: false, data: sortedTimestamps.map(ts => timeGroups[ts].feeding) },
      { name: 'Walking/Standing', type: 'line', stack: 'Total', areaStyle: {}, showSymbol: false, data: sortedTimestamps.map(ts => timeGroups[ts].walkingStanding) },
      { name: 'Resting', type: 'line', stack: 'Total', areaStyle: {}, showSymbol: false, data: sortedTimestamps.map(ts => timeGroups[ts].resting) }
    ];

    return { timestamps: timeData, series: trendSeries };
  }, [data]);

  return (
    <div className="flex flex-col w-full min-w-0">
      <div className="flex text-2xl font-semibold mb-4 items-center">
        Live Camera
        <span className="flex items-center px-2 ml-4 text-red-700 rounded-full bg-gray-200">
          <Radio size={20} strokeWidth={1.5} />
          <span className="ml-1 text-sm font-medium">LIVE</span>
        </span>
      </div>

      <div className="flex flex-row w-full min-w-0">
        <div className="flex justify-center bg-black rounded-lg grow aspect-video min-w-0">
          <CPVideoWithBBox 
            streamUrl="http://regulatory-valuable-prepaid-integration.trycloudflare.com/hls/live.m3u8" 
            activeBehaviors={activeBehaviors}
            offsetMs={offsetMs}
          />
        </div>
        
        {/* Config Section */}
        <div className="ml-4 p-4 border border-gray-300 rounded-lg w-64 shrink-0 bg-white shadow-sm">
          <h2 className="text-lg font-bold">Display Config</h2>
          
          <div className="flex flex-col space-y-3">
            <span className="text-sm text-gray-500 font-medium">Show Bounding Boxes:</span>
            {AVAILABLE_BEHAVIORS.map((behavior) => (
              <label 
                key={behavior.id} 
                className="flex items-center space-x-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={activeBehaviors.includes(behavior.id)}
                  onChange={() => toggleBehavior(behavior.id)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700 group-hover:text-black transition-colors">
                  {behavior.label}
                </span>
              </label>
            ))}
          </div>
          <div className="text-lg font-bold mt-6">Advanced Config</div>
          <div className="text-sm text-gray-600">
            <div>Fine-tune Offset: {offsetMs}ms</div>
            <div>
              <input 
                type="range" 
                min="-2000" 
                max="2000" 
                step="50" 
                value={offsetMs} 
                onChange={(e) => setOffsetMs(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col mt-6 p-4 border border-gray-300 rounded-lg w-full min-w-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Behaviour Trend (5-min)</h2>
        </div>
        <CPStackAreaPlot 
          timeData={trendData?.timestamps || []} 
          seriesData={trendData?.series || []} 
          loading={isLoading}
        />
      </div>
    </div>
  );
}