import React, { useMemo, useContext } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { Order } from '../types';
import { DocumentMagnifyingGlassIcon } from './ui/Icons';
import { ThemeContext } from '../contexts/ThemeContext';

interface LeadTimeAnalysisChartProps {
  orders: Order[];
  inModal?: boolean;
}

const getQuartile = (arr: number[], q: number): number => {
    const sorted = [...arr].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
        return sorted[base];
    }
};

const LeadTimeAnalysisChart: React.FC<LeadTimeAnalysisChartProps> = ({ orders, inModal = false }) => {
  const themeContext = useContext(ThemeContext);
  const { theme } = themeContext!;
  const isDark = theme === 'dark';

  const labelColor = isDark ? '#d4d4d8' : '#4B5563';
  const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';

  const chartData = useMemo(() => {
    const leadTimesByProductLine: Record<string, number[]> = {};
    
    const displayNameMap: Record<string, string> = {
        'NR': 'Notebook Gaming',
        'NB': 'Notebook',
        'AIO': 'All in One',
    };
    
    orders.forEach(order => {
      if (order.dateIssuePI && order.actualArrival) {
        const piDate = new Date(order.dateIssuePI);
        const arrivalDate = new Date(order.actualArrival);
        const leadTime = (arrivalDate.getTime() - piDate.getTime()) / (1000 * 60 * 60 * 24);

        if (leadTime >= 0) {
          const displayName = displayNameMap[order.productLine] || order.productLine;
          if (!leadTimesByProductLine[displayName]) {
            leadTimesByProductLine[displayName] = [];
          }
          leadTimesByProductLine[displayName].push(leadTime);
        }
      }
    });

    return Object.entries(leadTimesByProductLine)
      .map(([productLine, times]) => {
        if (times.length < 1) return null;
        times.sort((a, b) => a - b);
        const min = Math.round(times[0]);
        const max = Math.round(times[times.length - 1]);
        const median = Math.round(getQuartile(times, 0.5));
        const q1 = Math.round(getQuartile(times, 0.25));
        const q3 = Math.round(getQuartile(times, 0.75));
        
        return {
          x: productLine,
          y: [min, q1, median, q3, max],
          count: times.length,
        };
      })
      .filter((d): d is { x: string; y: number[]; count: number } => d !== null)
      .sort((a, b) => b.y[2] - a.y[2]); // Sort by median lead time
  }, [orders]);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-secondary-text p-4 text-center">
        <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
        <p className="text-sm">Not enough completed orders with arrival dates to calculate lead times.</p>
      </div>
    );
  }
  
  const isDense = chartData.length > 6;
  
  const series = [{
      type: 'boxPlot',
      data: chartData,
  }];

  const options: ApexOptions = {
    chart: {
        type: 'boxPlot',
        height: '100%',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
    },
    plotOptions: {
        boxPlot: {
            colors: {
                upper: '#3B82F6',
                lower: '#93C5FD'
            }
        }
    },
    xaxis: {
        type: 'category',
        labels: {
            style: {
                colors: labelColor,
                fontSize: '0.8125rem',
                fontWeight: 500,
            },
            rotate: isDense ? -45 : 0,
            rotateAlways: isDense,
            hideOverlappingLabels: true,
        }
    },
    yaxis: {
        title: {
            text: 'Lead Time (Days)',
            style: {
                color: labelColor,
                fontSize: '0.75rem',
                fontWeight: 500,
            },
        },
        labels: {
            style: {
                colors: labelColor,
                fontSize: '0.8125rem',
            }
        },
    },
    grid: {
        borderColor: gridBorderColor,
        strokeDashArray: 4,
        padding: {
            left: 10,
            right: 10,
        }
    },
    tooltip: {
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const item = chartData[dataPointIndex];
        if (!item) return '';
        const [min, q1, median, q3, max] = item.y;
        return `
            <div class="p-2 rounded-lg bg-secondary-bg dark:bg-dark-secondary-bg text-primary-text dark:text-dark-primary-text font-sans border border-border-color dark:border-dark-border-color shadow-lg text-sm">
                <div class="font-bold text-base mb-1">${item.x}</div>
                <div class="grid grid-cols-2 gap-x-4">
                    <span>Order Count:</span> <span class="font-semibold text-right">${item.count.toLocaleString()}</span>
                    <span>Median:</span> <span class="font-semibold text-right">${median} days</span>
                    <span>Q1-Q3 Range:</span> <span class="font-semibold text-right">${q1} - ${q3} days</span>
                    <span>Full Range:</span> <span class="font-semibold text-right">${min} - ${max} days</span>
                </div>
            </div>
        `;
      }
    },
  };

  return (
    <div className="w-full h-full">
      <ReactApexChart
        options={options}
        series={series}
        type="boxPlot"
        height="100%"
        width="100%"
      />
    </div>
  );
};

export default LeadTimeAnalysisChart;