import React, { useMemo, useContext } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { DocumentMagnifyingGlassIcon } from '../../ui/Icons';
import type { Sale } from '../../../types';
import { ThemeContext } from '../../../contexts/ThemeContext';

interface RevenueTrendChartProps {
  data: Sale[];
  granularity: 'monthly' | 'quarterly';
}

const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({ data: salesData, granularity }) => {
    const themeContext = useContext(ThemeContext);
    const { theme } = themeContext!;
    const isDark = theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';
    
    const trendData = useMemo(() => {
        // FIX: Explicitly type the accumulator in the reduce function to ensure correct type inference.
        const aggregated = salesData.reduce((acc: Record<string, { sortKey: string, label: string, value: number }>, sale) => {
            if (!sale.invoiceDate) return acc;
            const date = new Date(sale.invoiceDate);
            const year = date.getUTCFullYear();
            
            let key = '';
            let label = '';

            if (granularity === 'monthly') {
                const month = date.getUTCMonth();
                key = `${year}-${String(month + 1).padStart(2, '0')}`;
                label = `${date.toLocaleString('en-US', { timeZone: 'UTC', month: 'short' })} '${String(year).slice(2)}`;
            } else { // quarterly
                const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
                key = `${year}-Q${quarter}`;
                label = `Q${quarter} '${String(year).slice(2)}`;
            }

            if (!acc[key]) {
                acc[key] = { sortKey: key, label, value: 0 };
            }
            acc[key].value += sale.totalRevenue;
            return acc;
        }, {} as Record<string, { sortKey: string, label: string, value: number }>);
        
        return Object.values(aggregated).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [salesData, granularity]);
    
    const isDense = trendData.length > (granularity === 'monthly' ? 10 : 6);

    if (trendData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-secondary-text p-4 text-center">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No sales in the selected period.</p>
            </div>
        );
    }

    const series: ApexOptions['series'] = [{ 
        name: 'Total Revenue', 
        data: trendData.map(d => Math.round(d.value))
    }];

    const options: ApexOptions = {
        chart: { type: 'area', height: '100%', fontFamily: 'Inter, sans-serif', toolbar: { show: false }, zoom: { enabled: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.0, stops: [0, 100] } },
        markers: { size: 0, strokeWidth: 3, strokeColors: '#fff', hover: { size: 6 } },
        colors: ['#3B82F6'],
        legend: { show: false },
        xaxis: {
            type: 'category', categories: trendData.map(d => d.label),
            labels: { 
                style: { colors: labelColor, fontSize: '0.75rem' },
                rotate: isDense ? -45 : 0,
                rotateAlways: isDense,
                hideOverlappingLabels: true,
            },
            axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false }
        },
        yaxis: {
            labels: { 
                style: { colors: labelColor, fontSize: '0.75rem' }, 
                formatter: (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 0 }).format(val)
            },
            min: 0,
        },
        grid: { borderColor: gridBorderColor, strokeDashArray: 4, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
        tooltip: {
            custom: function({ series, seriesIndex, dataPointIndex, w }) {
                const currentData = trendData[dataPointIndex];
                if (!currentData) return '';
                const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(series[seriesIndex][dataPointIndex]);
                return `<div class="p-2 rounded-lg bg-secondary-bg dark:bg-dark-secondary-bg text-primary-text dark:text-dark-primary-text font-sans text-sm border border-border-color dark:border-dark-border-color shadow-lg"><div class="font-bold mb-1">${currentData.label}</div><div class="flex justify-between"><span>Revenue:</span><span class="font-semibold ml-4">${formattedValue}</span></div></div>`;
            }
        },
    };

    return (
         <div className="h-full w-full">
            <ReactApexChart options={options} series={series} type="area" height="100%" width="100%" />
         </div>
    );
};

export default RevenueTrendChart;