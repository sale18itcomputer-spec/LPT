import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface SparklineProps {
    data: number[];
}

const Sparkline: React.FC<SparklineProps> = React.memo(({ data }) => {
  if (!data || data.length < 2) {
    return <div className="h-8 w-24 flex items-center justify-center text-xs text-secondary-text">-</div>;
  }
  
  const lastSale = data[data.length - 1];

  const options: EChartsOption = useMemo(() => ({
    grid: {
        left: 1,
        right: 1,
        top: 2,
        bottom: 2,
    },
    xAxis: {
        type: 'category',
        show: false,
        data: data.map((_, i) => i),
        boundaryGap: false,
    },
    yAxis: {
        type: 'value',
        show: false,
        min: 'dataMin',
        max: 'dataMax'
    },
    series: [{
        data: data,
        type: 'line',
        showSymbol: false,
        lineStyle: {
            width: 2,
            color: '#3B82F6'
        },
        areaStyle: {
            color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [{
                    offset: 0, color: 'rgba(59, 130, 246, 0.2)'
                }, {
                    offset: 1, color: 'rgba(59, 130, 246, 0)'
                }]
            }
        },
    }],
    tooltip: { 
      show: true,
      trigger: 'axis',
      formatter: '{c0}',
      axisPointer: { type: 'none' },
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderColor: 'transparent',
      textStyle: { color: '#fff' }
    }
  }), [data]);

  return (
    <div className="w-24 h-8" title={`Last 90 days sales trend. Most recent week: ${lastSale} units.`} aria-label={`Sales trend sparkline, most recent week sold ${lastSale} units.`} role="img">
      <ReactECharts
        option={options}
        style={{ height: '100%', width: '100%' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
});

Sparkline.displayName = 'Sparkline';

export default Sparkline;