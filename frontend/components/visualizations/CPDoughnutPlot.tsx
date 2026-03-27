'use client'

import ReactECharts from 'echarts-for-react';
import { getSeriesColor } from '@/constants/behaviorColors';

export interface DoughnutData {
  name: string;
  value: number;
}

interface Props {
  data: DoughnutData[];
  loading?: boolean;
}

export default function CPDoughnutPlot({ data, loading = false }: Props) {
  const coloredData = data.map(d => ({
    ...d,
    itemStyle: { color: getSeriesColor(d.name) },
  }));

  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 8,
      extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);'
    },
    legend: {
      show: false 
    },
    series: [
      {
        name: 'Current Behaviour',
        type: 'pie',
        radius: ['40%', '60%'], 
        center: ['50%', '50%'], 
        avoidLabelOverlap: true, 
        itemStyle: {
          borderRadius: 6,
          borderColor: '#ffffff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}\n{d}%', 
          fontSize: 13,
          fontWeight: 500,
          color: '#475569',
          lineHeight: 18
        },

        labelLine: {
          show: true,
          length: 15,
          length2: 25,
          smooth: true,
          lineStyle: {
            width: 1.5,
            color: '#94a3b8'
          }
        },
        data: coloredData
      }
    ]
  };

  return (
    <ReactECharts
      option={option}
      showLoading={loading}
      className="rounded-sm h-72 w-full"
    />
  );
}