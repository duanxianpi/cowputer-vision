'use client'

import ReactECharts from 'echarts-for-react';

export interface DoughnutData {
  name: string;
  value: number;
}

interface Props {
  data: DoughnutData[];
  loading?: boolean;
}

export default function CPDoughnutPlot({ data, loading = false }: Props) {
  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      right: '10%',
      top: 'center'
    },
    series: [
      {
        name: 'Current Behaviour',
        type: 'pie',
        radius: ['50%', '80%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: 'center'
        },
        labelLine: {
          show: false
        },
        data: data
      }
    ]
  };

  return (
    <ReactECharts
      option={option}
      showLoading={loading}
      className="rounded-sm h-70 w-full"
    />
  );
}