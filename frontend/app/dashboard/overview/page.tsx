'use client';

import React, { useState, useEffect, useMemo } from 'react';
import CPDoughnutPlot, { DoughnutData } from '@/components/visualizations/CPDoughnutPlot';
import CPStackAreaPlot, { TrendSeries } from '@/components/visualizations/CPStackAreaPlot';
import { useTracks } from '@/hooks/track';

interface DashboardData {
  stats: {
    detectedCows: number;
    walkingStanding: number;
    feeding: number;
    resting: number;
  };
  behaviourData: DoughnutData[];
  trend: {
    timestamps: string[];
    series: TrendSeries[];
  };
}

export default function OverviewPage() {
  const { data, isLoading } = useTracks({
    behavior: ["feeding_head_down", "feeding_head_up", 'walking', 'standing', 'lying'],
    timeWindowMinutes: 5, // get data from the last 5 minute
  });

  const filterTimestamp = (data: any[]) => {
    if (!data || data.length === 0) return [];
    const sortedTimestamps = data.map(t => t.timestamp).sort((a, b) => b - a);
    const uniqueTimestamps = [...new Set(sortedTimestamps)];
    const secondLatestTimestamp = uniqueTimestamps[1] || uniqueTimestamps[0]; // Get the second latest timestamp, or fallback to the latest if only one exists
    return data.filter(t => t.timestamp == secondLatestTimestamp);
  }

  const dashboardData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Cards
    const filteredData = filterTimestamp(data);
    const stats = {
      detectedCows: new Set(filteredData.map(t => t.cow_id)).size,
      feeding: filteredData.filter(t => t.behavior === 'feeding_head_down' || t.behavior === 'feeding_head_up').length,
      walkingStanding: filteredData.filter(t => t.behavior === 'walking' || t.behavior === 'standing').length,
      resting: filteredData.filter(t => t.behavior === 'lying').length,
    };

    // Doughnut Plot
    const behaviourData = [
      { name: 'Feeding', value: stats.feeding },
      { name: 'Walking/Standing', value: stats.walkingStanding },
      { name: 'Resting', value: stats.resting },
    ];

    // Stack Area Plot
    const timeGroups: Record<string, { feeding: number; walkingStanding: number; resting: number }> = {};

    data.forEach(t => {
      const ts = t.timestamp.toString();

      if (!timeGroups[ts]) {
        timeGroups[ts] = { feeding: 0, walkingStanding: 0, resting: 0 };
      }

      console.log(t.behavior)

      if (t.behavior === 'feeding_head_down' || t.behavior === 'feeding_head_up') timeGroups[ts].feeding++;
      else if (t.behavior === 'walking' || t.behavior === 'standing') timeGroups[ts].walkingStanding++;
      else if (t.behavior === 'lying') timeGroups[ts].resting++;
    });

    const sortedTimestamps = Object.keys(timeGroups).sort((a, b) => Number(a) - Number(b));

    // Generate X axis labels in HH:mm:ss format
    const timeData = sortedTimestamps.map(ts => {
      const date = new Date(Number(ts)); 
      const hh = date.getHours().toString().padStart(2, '0');
      const mm = date.getMinutes().toString().padStart(2, '0');
      const ss = date.getSeconds().toString().padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    });

    // Generate series data for the stack area plot
    const trendSeries = [
      {
        name: 'Feeding',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        showSymbol: false,
        data: sortedTimestamps.map(ts => timeGroups[ts].feeding)
      },
      {
        name: 'Walking/Standing',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        showSymbol: false,
        data: sortedTimestamps.map(ts => timeGroups[ts].walkingStanding)
      },
      {
        name: 'Resting',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        showSymbol: false,
        data: sortedTimestamps.map(ts => timeGroups[ts].resting)
      }
    ];

    return {
      stats,
      behaviourData,
      trend: {
        timestamps: timeData,
        series: trendSeries
      }
    } as DashboardData;
  }, [data]);

  return (
    <div className="min-h-screen p-6 text-black">
      <h1 className="text-xl font-bold mb-6">Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 flex flex-col items-center justify-center rounded-sm shadow-sm">
          <h2 className="text-lg font-bold mb-2">Detected Cows</h2>
          <span className="text-5xl font-black">{dashboardData?.stats.detectedCows ?? 0}</span>
        </div>
        
        <div className="bg-white p-6 flex flex-col items-center justify-center rounded-sm shadow-sm">
          <h2 className="text-lg font-bold mb-2">Walking/Standing</h2>
          <span className="text-5xl font-black">{dashboardData?.stats.walkingStanding ?? 0}</span>
        </div>

        <div className="bg-white p-4 flex flex-col rounded-sm shadow-sm md:row-span-2">
          <h2 className="text-lg font-bold mb-4">Alerts</h2>
          <div className="flex-1 bg-[#d1d5db] flex items-center justify-center text-center text-sm p-4 rounded-sm min-h-[150px]">
            Display Alerts<br />Summary &<br />History
          </div>
        </div>

        <div className="bg-white p-6 flex flex-col items-center justify-center rounded-sm shadow-sm">
          <h2 className="text-lg font-bold mb-2">Feeding</h2>
          <span className="text-5xl font-black">{dashboardData?.stats.feeding ?? 0}</span>
        </div>

        <div className="bg-white p-6 flex flex-col items-center justify-center rounded-sm shadow-sm">
          <h2 className="text-lg font-bold mb-2">Resting</h2>
          <span className="text-5xl font-black">{dashboardData?.stats.resting ?? 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current Behaviour */}
        <div className="bg-white p-4 rounded-sm shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Current Behaviour</h2>
            <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-black transition-colors">
            </button>
          </div>
          <CPDoughnutPlot 
            data={dashboardData?.behaviourData || []} 
            loading={isLoading} 
          />
        </div>

        {/* Behaviour Trend */}
        <div className="bg-white p-4 rounded-sm shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Behaviour Trend (5-min)</h2>
            <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-black transition-colors">
            </button>
          </div>
          <CPStackAreaPlot 
            timeData={dashboardData?.trend.timestamps || []} 
            seriesData={dashboardData?.trend.series || []} 
            loading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}