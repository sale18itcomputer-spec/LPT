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

const UnitVarianceTimeSeriesChart: React.FC<ChartProps> = ({ orders, sales }) => {
    const themeContext = useContext(ThemeContext);
    const { theme } = themeContext!;
    const isDark = theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';
    
    const chartData = useMemo(() => {
        const aggregated = new Map<string, { orderUnits: number, saleUnits: number }>();
        
        // Use order date for orders
        orders.forEach(order => {
            if (order.dateIssuePI) {
                const date = new Date(order.dateIssuePI);
                const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
                if (!aggregated.has(key)) aggregated.set(key, { orderUnits: 0, saleUnits: 0 });
                aggregated.get(key)!.orderUnits += order.qty;
            }
        });
        
        // Use invoice date for sales
        (sales as (Sale & { salesOrder: string })[]).forEach(sale => {
            if (sale.invoiceDate) {
                 const date = new Date(sale.invoiceDate);
                const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
                if (!aggregated.has(key)) aggregated.set(key, { orderUnits: 0, saleUnits: 0 });
                aggregated.get(key)!.saleUnits += sale.quantity;
            }
        });
        
        const sortedKeys = Array.from(aggregated.keys()).sort();
        
        return {
            categories: sortedKeys.map(k => new Date(`${k}-01T00:00:00Z`).toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })),
            series: [
                { name: 'Ordered Units', type: 'column', data: sortedKeys.map(k => aggregated.get(k)!.orderUnits) },
                { name: 'Sold Units', type: 'column', data: sortedKeys.map(k => aggregated.get(k)!.saleUnits) },
                { name: 'Net Variance', type: 'line', data: sortedKeys.map(k => {
                    const data = aggregated.get(k)!;
                    return data.orderUnits - data.saleUnits;
                })},
            ],
        };
    }, [orders, sales]);

    if (chartData.categories.length < 2) {
        return <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center"><DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" /><p className="text-sm">Not enough monthly data to show a trend.</p></div>;
    }

    const isDense = chartData.categories.length > 12;

    const options: ApexOptions = {
        chart: { type: 'line', height: '100%', fontFamily: 'Inter, sans-serif', toolbar: { show: false }, stacked: false },
        dataLabels: { enabled: false },
        stroke: { width: [0, 0, 3], curve: 'smooth' },
        colors: ['#3B82F6', '#10B981', '#F97316'],
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
        yaxis: [{
            seriesName: 'Ordered Units',
            axisTicks: { show: true },
            axisBorder: { show: true, color: labelColor },
            labels: { style: { colors: labelColor } },
            title: { text: "Units Ordered/Sold", style: { color: labelColor } },
        },
        {
            seriesName: 'Sold Units',
            show: false
        },
        {
            seriesName: 'Net Variance',
            opposite: true,
            axisTicks: { show: true },
            axisBorder: { show: true, color: '#F97316' },
            labels: { style: { colors: '#F97316' } },
            title: { text: "Net Variance (Ordered - Sold)", style: { color: labelColor } }
        }],
        grid: { borderColor: gridBorderColor, strokeDashArray: 4 },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            shared: true,
            intersect: false,
            y: {
                formatter: (val) => val.toLocaleString() + ' units'
            }
        },
    };

    return (
        <div className="h-full">
            <ReactApexChart options={options} series={chartData.series} type="line" height="100%" />
        </div>
    );
};

export default UnitVarianceTimeSeriesChart;