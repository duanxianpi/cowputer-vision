'use client';

import React, { useMemo } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Bell, BellOff, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CPDoughnutPlot, { DoughnutData } from '@/components/visualizations/CPDoughnutPlot';
import CPStackAreaPlot, { TrendSeries } from '@/components/visualizations/CPStackAreaPlot';
import CPPageHeader from '@/components/CPPageHeader';
import { useTracks } from '@/hooks/track';
import { useAlertsList } from '@/hooks/alert';
import type { AlertRule, AlertEvent } from '@/services/alert';
import { getBehaviorBadge } from '@/constants/behaviorColors';

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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function OverviewPage() {
  const router = useRouter();

  const { data: alertRules, isLoading: alertsLoading } = useAlertsList(true);

  const alertSummary = useMemo(() => {
    if (!alertRules) return null;
    const activeCount = alertRules.filter((r: AlertRule) => r.is_active !== false).length;
    const allEvents = alertRules.flatMap((r: AlertRule) =>
      (r.events ?? []).map((e: AlertEvent) => ({ ...e, ruleName: r.name }))
    );
    allEvents.sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime());
    return { total: alertRules.length, activeCount, recentEvents: allEvents.slice(0, 3) };
  }, [alertRules]);

  const { data, isLoading } = useTracks({
    behavior: ["feeding_head_down", "feeding_head_up", 'walking', 'standing', 'lying'],
    timeWindowMinutes: 5, // get data from the last 5 minute
  },
  {
    refetchInterval: 5000,
    refetchOnWindowFocus: true
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
    <div className="p-6">
      <CPPageHeader title="Overview" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 flex flex-col items-center justify-center rounded-lg shadow-sm">
          <h2 className="text-lg font-bold mb-2">Detected Cows</h2>
          <span className="text-5xl font-black">{isLoading ? <Skeleton width={60} height={48} /> : dashboardData?.stats.detectedCows ?? 0}</span>
        </div>
        
        <div className="bg-white p-6 flex flex-col items-center justify-center rounded-lg shadow-sm">
          <h2 className="text-lg font-bold mb-2">Walking/Standing</h2>
          <span className="text-5xl font-black">{isLoading ? <Skeleton width={60} height={48} /> : dashboardData?.stats.walkingStanding ?? 0}</span>
        </div>

        <div className="bg-white p-4 flex flex-col rounded-lg shadow-sm md:row-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Alerts</h2>
            <button
              onClick={() => router.push('/dashboard/alerts')}
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Stats row */}
          {alertsLoading ? (
            <div className="flex gap-3 mb-3">
              <Skeleton height={48} containerClassName="flex-1" borderRadius={8} />
              <Skeleton height={48} containerClassName="flex-1" borderRadius={8} />
            </div>
          ) : (
            <div className="flex gap-3 mb-3">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
                <Bell className="w-4 h-4 text-green-900" />
                <div>
                  <p className="text-lg font-bold text-green-900 leading-tight">{alertSummary?.activeCount ?? 0}</p>
                  <p className="text-[10px] text-green-900">Active</p>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100">
                <BellOff className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-lg font-bold text-gray-700 leading-tight">{(alertSummary?.total ?? 0) - (alertSummary?.activeCount ?? 0)}</p>
                  <p className="text-[10px] text-gray-500">Inactive</p>
                </div>
              </div>
            </div>
          )}

          {/* Recent events */}
          <p className="text-xs font-medium text-gray-500 mb-2">Recent Events</p>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {alertsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height={36} borderRadius={6} />
              ))
            ) : !alertSummary?.recentEvents.length ? (
              <p className="text-xs text-gray-400 text-center py-6">No events triggered yet</p>
            ) : (
              alertSummary.recentEvents.map((event) => {
                const details = (event.details ?? {}) as Record<string, unknown>;
                const behavior = String(details.behavior ?? 'unknown');
                const colorClass = getBehaviorBadge(behavior);

                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate"> {String(details.cow_id ?? '')} triggered {event.ruleName}</p>
                      <p className="text-[10px] text-gray-400">{timeAgo(event.triggered_at)}</p>
                    </div>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${colorClass}`}>
                      {behavior.replace('_', ' ')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white p-6 flex flex-col items-center justify-center rounded-lg shadow-sm">
          <h2 className="text-lg font-bold mb-2">Feeding</h2>
          <span className="text-5xl font-black">{isLoading ? <Skeleton width={60} height={48} /> : dashboardData?.stats.feeding ?? 0}</span>
        </div>

        <div className="bg-white p-6 flex flex-col items-center justify-center rounded-lg shadow-sm">
          <h2 className="text-lg font-bold mb-2">Resting</h2>
          <span className="text-5xl font-black">{isLoading ? <Skeleton width={60} height={48} /> : dashboardData?.stats.resting ?? 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
        {/* Current Behaviour */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Current Behaviour</h2>
          </div>
          <CPDoughnutPlot 
            data={dashboardData?.behaviourData || []} 
            loading={isLoading} 
          />
        </div>

        {/* Behaviour Trend */}
        <div className="bg-white p-4 rounded-lg shadow-sm min-w-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Behaviour Trend (5-min)</h2>
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