import React, { useMemo, useContext } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import Card from '../../ui/Card';
import { DocumentMagnifyingGlassIcon } from '../../ui/Icons';
import { ThemeContext } from '../../../contexts/ThemeContext';
import type { Order, Sale } from '../../../types';

interface ChartProps {
    orders: Order[];
    sales: Sale[];
}

const ValueReconciliationChart: React.FC<ChartProps> = ({ orders, sales }) => {
    const themeContext = useContext(ThemeContext);
    const { theme } = themeContext!;
    const isDark = theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';
    
    const chartData = useMemo(() => {
        const aggregated = new Map<string, { orderValue: number, saleValue: number }>();
        
        orders.forEach(order => {
            if (order.dateIssuePI) {
                const date = new Date(order.dateIssuePI);
                const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
                if (!aggregated.has(key)) aggregated.set(key, { orderValue: 0, saleValue: 0 });
                aggregated.get(key)!.orderValue += order.orderValue;
            }
        });
        
        (sales as (Sale & { salesOrder: string })[]).forEach(sale => {
            if (sale.invoiceDate) {
                 const date = new Date(sale.invoiceDate);
                const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
                if (!aggregated.has(key)) aggregated.set(key, { orderValue: 0, saleValue: 0 });
                aggregated.get(key)!.saleValue += sale.totalRevenue;
            }
        });
        
        const sortedKeys = Array.from(aggregated.keys()).sort();
        
        return {
            categories: sortedKeys.map(k => new Date(`${k}-01T00:00:00Z`).toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })),
            series: [
                { name: 'Order Value (FOB)', data: sortedKeys.map(k => Math.round(aggregated.get(k)!.orderValue)) },
                { name: 'Sale Revenue', data: sortedKeys.map(k => Math.round(aggregated.get(k)!.saleValue)) },
            ],
        };
    }, [orders, sales]);

    if (chartData.categories.length < 2) {
        return <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center"><DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" /><p className="text-sm">Not enough monthly data to show a trend.</p></div>;
    }

    const isDense = chartData.categories.length > 12;

    const options: ApexOptions = {
        chart: { type: 'area', height: '100%', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: [0.5, 0.6], opacityTo: [0.0, 0.1], stops: [0, 100] } },
        colors: ['#3B82F6', '#10B981'],
        legend: { position: 'top', horizontalAlign: 'right', labels: { colors: labelColor } },
        xaxis: { 
            categories: chartData.categories, 
            labels: { 
                style: { colors: labelColor },
                hideOverlappingLabels: true,
                rotate: isDense ? -45 : 0,
                rotateAlways: isDense,
            }, 
            axisBorder: { show: false }, 
            axisTicks: { show: false } 
        },
        yaxis: { labels: { style: { colors: labelColor }, formatter: val => val.toLocaleString('en-US', { notation: 'compact' }) } },
        grid: { borderColor: gridBorderColor, strokeDashArray: 4 },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            shared: true,
            intersect: false,
            custom: function({ series, dataPointIndex, w }) {
                const category = w.globals.labels[dataPointIndex];
                const orderValue = series[0][dataPointIndex];
                const saleValue = series[1][dataPointIndex];
                const variance = saleValue - orderValue;
                
                const formattedOrderValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(orderValue);
                const formattedSaleValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(saleValue);
                const formattedVariance = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(variance);
                
                const varianceColor = variance >= 0 ? 'text-green-600' : 'text-red-600';
    
                return `
                  <div class="p-2 rounded-lg bg-secondary-bg dark:bg-dark-secondary-bg text-primary-text dark:text-dark-primary-text font-sans text-sm border border-border-color dark:border-dark-border-color shadow-lg">
                    <div class="font-bold mb-1">${category}</div>
                    <div class="grid grid-cols-[auto,1fr] gap-x-4">
                        <span>Order Value:</span><span class="font-semibold text-right">${formattedOrderValue}</span>
                        <span>Sale Revenue:</span><span class="font-semibold text-right">${formattedSaleValue}</span>
                        <div class="col-span-2 my-1 border-t border-border-color dark:border-dark-border-color"></div>
                        <span>Variance:</span><span class="font-semibold text-right ${varianceColor}">${variance > 0 ? '+' : ''}${formattedVariance}</span>
                    </div>
                  </div>
                `;
            }
        },
    };

    return (
        <div className="h-full">
            <ReactApexChart options={options} series={chartData.series} type="area" height="100%" />
        </div>
    );
};

export default ValueReconciliationChart;