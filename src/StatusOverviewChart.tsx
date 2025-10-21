import React, { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { DocumentMagnifyingGlassIcon } from './ui/Icons';

interface StatusData {
  name: string;
  value: number;
}

const STATUS_COLORS: Record<string, string> = {
    'Arrived': '#16A34A',
    'Delivered': '#10B981',
    'In Transit Hub (SGP)': '#3B82F6',
    'Pending': '#F59E0B',
    'Shipped': '#60A5FA',
    'Released to Manufacturing': '#F97316',
};
const MUTED_COLOR = '#D1D5DB';

interface StatusOverviewChartProps {
  data: StatusData[];
  inModal?: boolean;
}

const StatusOverviewChart: React.FC<StatusOverviewChartProps> = ({ data, inModal = false }) => {
    
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-secondary-text">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No data to display</p>
            </div>
        );
    }

    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    
    const chartColors = useMemo(() => {
        return data.map(d => STATUS_COLORS[d.name] || '#64748B');
    }, [data]);
    
    const series = [{
        data: data.map(d => ({ x: d.name, y: d.value }))
    }];

    const options: ApexOptions = {
        chart: {
            type: 'treemap',
            height: '100%',
            fontFamily: 'Inter, sans-serif',
            toolbar: { show: false },
        },
        plotOptions: {
            treemap: {
                distributed: true,
                enableShades: false,
            }
        },
        colors: chartColors,
        legend: { show: false },
        dataLabels: {
            enabled: true,
            style: {
              fontSize: '0.875rem',
              fontWeight: 'bold',
              fontFamily: 'Inter, sans-serif',
            },
            formatter: function(text: string, op) {
              const { w, dataPointIndex } = op;
              if (!w?.globals?.series || !Array.isArray(w.globals.series[0]) || w.globals.series[0][dataPointIndex] === undefined) {
                return text;
              }
              const value = w.globals.series[0][dataPointIndex];
              const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(value);
              return [text, formattedValue];
            },
            offsetY: -4
        },
        tooltip: {
            custom: function({ seriesIndex, dataPointIndex, w }) {
                const item = data[dataPointIndex];
                if (!item) return '';
                const percentage = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0;
                return `
                  <div class="p-2 rounded-lg bg-secondary-bg text-primary-text font-sans border border-border-color shadow-lg">
                      <div class="font-bold text-base">${item.name}</div>
                      <div><strong>Value:</strong> ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.value)}</div>
                      <div class="mt-1 border-t border-border-color pt-1"><strong>${percentage}%</strong> of total value</div>
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
                type="treemap"
                height="100%"
                width="100%"
            />
        </div>
    );
};

export default StatusOverviewChart;