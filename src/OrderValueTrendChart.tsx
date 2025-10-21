import React, { useMemo, useContext } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { DocumentMagnifyingGlassIcon } from './ui/Icons';
import type { Order } from '../types';
import Card from './ui/Card';
import { ThemeContext } from '../contexts/ThemeContext';

interface TrendData {
  sortKey: string;
  label: string;
  value: number;
  year: string;
  quarterNum: string;
}

interface OrderValueTrendChartProps {
  orders: Order[];
  inModal?: boolean;
}

const aggregateData = (orders: Order[]): TrendData[] => {
    const aggregated = orders.reduce((acc, order) => {
        if (!order.dateIssuePI) return acc;
        const date = new Date(order.dateIssuePI);
        const year = date.getUTCFullYear();

        const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
        const quarterNum = `Q${quarter}`;
        
        let key = '', label = '';

        const month = date.getUTCMonth();
        key = `${year}-${String(month + 1).padStart(2, '0')}`;
        label = `${date.toLocaleString('en-US', { timeZone: 'UTC', month: 'short' })} '${String(year).slice(2)}`;

        if (!acc[key]) {
            acc[key] = { sortKey: key, label, value: 0, year: String(year), quarterNum };
        }
        acc[key].value += order.orderValue;
        return acc;
    }, {} as Record<string, TrendData>);
    
    return Object.values(aggregated).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
};


const ChartComponent: React.FC<OrderValueTrendChartProps> = ({ orders, inModal = false }) => {
    const themeContext = useContext(ThemeContext);
    const { theme } = themeContext!;
    const isDark = theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';

    const data = useMemo(() => aggregateData(orders), [orders]);

  if (data.length < 2) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center">
            <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
            <p className="text-sm">Not enough data to show a monthly trend.</p>
        </div>
    );
  }
   if (data.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center">
            <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
            <p className="text-sm">No orders in the selected period.</p>
        </div>
    );
  }
  
  const isDense = data.length > (inModal ? 20 : 12);

  const series: ApexOptions['series'] = [{
    name: 'Order Value',
    data: data.map(d => Math.round(d.value))
  }];

  const options: ApexOptions = {
    chart: {
        type: 'area',
        height: '100%',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { 
        curve: 'smooth',
        width: [3, 2, 2],
    },
    fill: {
        type: 'gradient',
        gradient: {
            shadeIntensity: 1,
            opacityFrom: [0.4, 0.3, 0],
            opacityTo: [0.0, 0.0, 0],
            stops: [0, 100]
        }
    },
    markers: {
        size: 0,
        strokeWidth: 3,
        strokeColors: '#fff',
        hover: { size: 6 }
    },
    colors: ['#3B82F6'],
    legend: { show: false },
    xaxis: {
        type: 'category',
        categories: data.map(d => d.label),
        labels: {
            style: {
                colors: labelColor,
                fontSize: '0.75rem',
            },
            rotate: isDense ? -45 : 0,
            rotateAlways: isDense,
            hideOverlappingLabels: true,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false }
    },
    yaxis: {
        labels: {
            style: {
                colors: labelColor,
                fontSize: '0.75rem',
            },
            formatter: (val) => val.toLocaleString('en-US'),
        },
        min: 0,
    },
    grid: {
        borderColor: gridBorderColor,
        strokeDashArray: 4,
        yaxis: {
            lines: { show: true }
        },
        xaxis: {
            lines: { show: false }
        }
    },
    tooltip: {
        custom: function({ series, seriesIndex, dataPointIndex, w }) {
            if (!series || !series[seriesIndex] || series[seriesIndex][dataPointIndex] === undefined) {
                return '';
            }
            const currentData = data[dataPointIndex];
            if (!currentData) return '';
            
            const tooltipParts: string[] = [];
            
            w.globals.seriesNames.forEach((name: string, i: number) => {
                const value = series[i][dataPointIndex];
                if (value !== undefined && value !== null) {
                    const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
                    tooltipParts.push(`<div class="flex justify-between"><span>${name}:</span><span class="font-semibold ml-4">${formattedValue}</span></div>`);
                }
            });

            return `
              <div class="p-2 rounded-lg bg-secondary-bg dark:bg-dark-secondary-bg text-primary-text dark:text-dark-primary-text font-sans text-sm border border-border-color dark:border-dark-border-color shadow-lg">
                <div class="font-bold mb-1">${currentData.label}</div>
                ${tooltipParts.join('')}
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
            type="area"
            height="100%"
            width="100%"
        />
    </div>
  );
};


const OrderValueTrendChart = React.forwardRef<HTMLDivElement, OrderValueTrendChartProps>(({ orders, inModal = false }, ref) => {

    if (inModal) {
        return (
             <div className="h-full w-full flex flex-col">
                <div className="flex-grow min-h-0"><ChartComponent orders={orders} inModal /></div>
            </div>
        );
    }
    
    return (
        <div ref={ref} className="w-full h-full">
            <ChartComponent orders={orders} />
        </div>
    );
});

OrderValueTrendChart.displayName = 'OrderValueTrendChart';

export default OrderValueTrendChart;