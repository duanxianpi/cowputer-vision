'use client';

import ReactECharts from 'echarts-for-react';
import { TrackingData } from '@/services/track';
import { useMemo } from 'react';
import { BEHAVIOR_HEX, BEHAVIOR_HEX_DEFAULT, BEHAVIOR_LABELS } from '@/constants/behaviorColors';

interface Props {
  tracks: TrackingData[];
  cowId: string;
  loading?: boolean;
}

export default function CPCowStateTimeline({ tracks, cowId, loading = false }: Props) {
  const { timestamps, segments, behaviors } = useMemo(() => {
    if (!tracks || tracks.length === 0 || !cowId)
      return { timestamps: [], segments: [], behaviors: [] };

    const cowTracks = tracks.filter(t => t.cow_id === cowId);
    if (cowTracks.length === 0) return { timestamps: [], segments: [], behaviors: [] };

    const tsSet = new Set<number>();
    cowTracks.forEach(t => tsSet.add(t.timestamp));
    const sortedTs = [...tsSet].sort((a, b) => a - b);

    // For each timestamp, pick the dominant behavior
    const lookup: Record<number, string> = {};
    const counts: Record<number, Record<string, number>> = {};
    cowTracks.forEach(t => {
      if (!counts[t.timestamp]) counts[t.timestamp] = {};
      counts[t.timestamp][t.behavior] = (counts[t.timestamp][t.behavior] || 0) + 1;
    });
    for (const ts of sortedTs) {
      const bCounts = counts[ts];
      if (bCounts) {
        lookup[ts] = Object.entries(bCounts).sort((a, b) => b[1] - a[1])[0][0];
      }
    }

    // Build segments: [0, startTsIndex, endTsIndex, behavior]
    const segs: [number, number, number, string][] = [];
    let segStart = -1;
    let segBehavior = '';
    for (let i = 0; i < sortedTs.length; i++) {
      const b = lookup[sortedTs[i]];
      if (!b) {
        if (segStart >= 0) { segs.push([0, segStart, i, segBehavior]); segStart = -1; }
        continue;
      }
      if (b !== segBehavior || segStart < 0) {
        if (segStart >= 0) segs.push([0, segStart, i, segBehavior]);
        segStart = i;
        segBehavior = b;
      }
    }
    if (segStart >= 0) segs.push([0, segStart, sortedTs.length - 1, segBehavior]);

    const usedBehaviors = [...new Set(segs.map(s => s[3]))];

    return { timestamps: sortedTs, segments: segs, behaviors: usedBehaviors };
  }, [tracks, cowId]);

  const timeLabels = timestamps.map(ts => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  });

  const option = {
    tooltip: {
      formatter: (params: { value: [number, number, number, string] }) => {
        const [, start, end, behavior] = params.value;
        return `<b>Cow ${cowId}</b><br/>${BEHAVIOR_LABELS[behavior] || behavior}<br/>${timeLabels[start]} – ${timeLabels[end]}`;
      },
    },
    legend: {
      data: behaviors.map(b => BEHAVIOR_LABELS[b] || b),
      top: 0,
      textStyle: { fontSize: 11 },
    },
    grid: { left: '3%', right: '3%', bottom: '3%', top: 30, containLabel: true },
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: [cowId],
      axisLabel: { fontSize: 11 },
    },
    series: behaviors.map(behavior => ({
      name: BEHAVIOR_LABELS[behavior] || behavior,
      type: 'custom',
      itemStyle: {
        color: BEHAVIOR_HEX[behavior] || BEHAVIOR_HEX_DEFAULT
      },
      renderItem: (
        _params: any,
        api: any
      ) => {
        const start = api.value(1);
        const end = api.value(2);
        const startCoord = api.coord([start, 0]);
        const endCoord = api.coord([end, 0]);
        const barHeight = api.size([0, 1])[1] * 0.5;

        return {
          type: 'rect',
          shape: {
            x: startCoord[0],
            y: startCoord[1] - barHeight / 2,
            width: Math.max(endCoord[0] - startCoord[0], 3),
            height: barHeight,
            r: 2,
          },
          style: api.style(), 
        };
      },
      encode: { x: [1, 2], y: 0 },
      data: segments.filter(s => s[3] === behavior).map(s => ({ value: s })),
      clip: true,
    })),
  };

  return (
    <ReactECharts
      option={option}
      showLoading={loading}
      style={{ height: 160, width: '100%' }}
    />
  );
}
