'use client'

import ReactECharts from 'echarts-for-react';
import { getSeriesColor } from '@/constants/behaviorColors';

export interface TrendSeries {
  name: string;
  data: number[];
}

interface Props {
  timeData: string[];
  seriesData: TrendSeries[];
  loading?: boolean;
}

export default function CPStackAreaPlot({ timeData, seriesData, loading = false }: Props) {
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } }
    },
    legend: {
      top: '5%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        boundaryGap: false,
        data: timeData
      }
    ],
    yAxis: [
      {
        type: 'value'
      }
    ],
    series: seriesData.map((s) => ({
      name: s.name,
      type: 'line',
      stack: 'Total',
      areaStyle: {},
      emphasis: { focus: 'series' },
      data: s.data,
      itemStyle: { color: getSeriesColor(s.name) },
      lineStyle: { color: getSeriesColor(s.name) },
    }))
  };

  return (
    <ReactECharts
      option={option}
      showLoading={loading}
      className="rounded-sm h-70 w-full"
    />
  );
}