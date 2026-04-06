'use client';

import CPVideoWithBBox from "@/components/CPVideoWithBBox";
import { Radio, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import CPStackAreaPlot from "@/components/visualizations/CPStackAreaPlot";
import CPCowStateTimeline from "@/components/visualizations/CPCowBehaviorChart";
import CPPageHeader from "@/components/CPPageHeader";
import { useTracks } from "@/hooks/track";
import { getBehaviorBadge } from "@/constants/behaviorColors";

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
  const [offsetMs, setOffsetMs] = useState(-500);
  const [selectedCow, setSelectedCow] = useState<string>("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const { data, isLoading } = useTracks({
    behavior: ["feeding_head_down", "feeding_head_up", 'walking', 'standing', 'lying'],
    timeWindowMinutes: 5,
  },
  {
    refetchInterval: 5000,
    refetchOnWindowFocus: true
  });

  const toggleBehavior = (behaviorId: string) => {
    setActiveBehaviors(prev => 
      prev.includes(behaviorId) 
        ? prev.filter(id => id !== behaviorId) 
        : [...prev, behaviorId]
    );
  };

  const cowIds = useMemo(() => {
    if (!data || data.length === 0) return [];
    const ids = [...new Set(data.map(t => t.cow_id))].sort();
    return ids;
  }, [data]);

  // Auto-select first cow when data loads and no cow is selected
  useMemo(() => {
    if (cowIds.length > 0 && !selectedCow) {
      setSelectedCow(cowIds[0]);
    }
  }, [cowIds, selectedCow]);

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
    <div className="flex flex-col w-full min-w-0 p-6">
      <CPPageHeader
        title="Live Camera"
        actions={
          <span className="flex items-center px-2 text-red-700 rounded-full bg-gray-200">
            <Radio size={20} strokeWidth={1.5} />
            <span className="ml-1 text-sm font-medium">LIVE</span>
          </span>
        }
      />

      <div className="flex flex-row w-full min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-4 w-full">
          <div className="flex justify-center bg-black rounded-lg grow aspect-video min-w-125">
            <CPVideoWithBBox 
              streamUrl="http://70.69.192.6:29831/hls/live.m3u8" 
              activeBehaviors={activeBehaviors}
              offsetMs={offsetMs}
            />
          </div>
          
          {/* Config Section */}
          <div className="p-4 border border-gray-300 rounded-lg bg-white shadow-sm">
            <div className="text-sm font-bold mb-3">Display Config</div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-gray-500 font-medium">Filtering Behaviours:</span>
              <div className="flex flex-col gap-1.5">
                {AVAILABLE_BEHAVIORS.map((behavior) => {
                  const active = activeBehaviors.includes(behavior.id);
                  return (
                    <button
                      key={behavior.id}
                      type="button"
                      onClick={() => toggleBehavior(behavior.id)}
                      className={`max-w-max px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        active
                          ? getBehaviorBadge(behavior.id)
                          : 'bg-gray-100 text-gray-400 line-through'
                      }`}
                    >
                      {behavior.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAdvancedOpen(v => !v)}
              className="flex items-center justify-between w-full mt-5 text-sm font-bold text-gray-800 hover:text-black transition-colors"
            >
              Advanced Config
              <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </button>
            {advancedOpen && (
              <div className="text-sm text-gray-600 mt-2">
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
            )}
          </div>
        </div>
      </div>

      {/* Charts row: Stack area (left) + State timeline (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6 w-full min-w-0">
        <div className="flex flex-col flex-1 min-w-0 p-4 border border-gray-300 rounded-lg">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Behaviour Trend (5-min)</h2>
          <CPStackAreaPlot 
            timeData={trendData?.timestamps || []} 
            seriesData={trendData?.series || []} 
            loading={isLoading}
          />
        </div>

        <div className="flex flex-col flex-1 min-w-0 p-4 border border-gray-300 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Per-Cow State Timeline</h2>
            <select
              value={selectedCow}
              onChange={(e) => setSelectedCow(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {cowIds.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>
          <CPCowStateTimeline tracks={data ?? []} cowId={selectedCow} loading={isLoading} />
        </div>
      </div>
    </div>
  );
}