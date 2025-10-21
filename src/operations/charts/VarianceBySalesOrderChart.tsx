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

const VarianceBySalesOrderChart: React.FC<ChartProps> = ({ orders, sales }) => {
    const themeContext = useContext(ThemeContext);
    const { theme } = themeContext!;
    const isDark = theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const dataLabelColor = isDark ? '#f9fafb' : '#1F2937';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';

    const chartData = useMemo(() => {
        const varianceBySo = new Map<string, { orderQty: number, saleQty: number }>();

        orders.forEach(order => {
            const so = order.salesOrder;
            if (!varianceBySo.has(so)) varianceBySo.set(so, { orderQty: 0, saleQty: 0 });
            varianceBySo.get(so)!.orderQty += order.qty;
        });

        (sales as (Sale & { salesOrder: string })[]).forEach(sale => {
            if (sale.salesOrder) {
                const so = sale.salesOrder;
                if (!varianceBySo.has(so)) varianceBySo.set(so, { orderQty: 0, saleQty: 0 });
                varianceBySo.get(so)!.saleQty += sale.quantity;
            }
        });

        const sorted = Array.from(varianceBySo.entries())
            .map(([so, data]) => ({ 
                so, 
                ...data, 
                variance: data.orderQty - data.saleQty 
            }))
            .filter(({ variance }) => variance !== 0)
            .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
            .slice(0, 10)
            .sort((a,b) => b.variance - a.variance);

        return {
            categories: sorted.map(d => d.so),
            series: [{ name: 'Unit Variance', data: sorted.map(d => d.variance) }],
            fullData: sorted
        };
    }, [orders, sales]);

    if (chartData.categories.length === 0) {
        return <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center"><DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" /><p className="text-sm">No sales orders with unit variances found.</p></div>;
    }
    
    const options: ApexOptions = {
        chart: { type: 'bar', height: '100%', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, barHeight: '60%', borderRadius: 4, dataLabels: { position: 'top' } } },
        dataLabels: { enabled: true, formatter: (val) => `${Number(val) > 0 ? '+' : ''}${val}`, offsetX: 20, style: { colors: [dataLabelColor] } },
        colors: [({ value }) => Number(value) > 0 ? '#3B82F6' : '#F97316'],
        xaxis: { categories: chartData.categories, labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { colors: labelColor, fontSize: '12px' } } },
        grid: { show: true, borderColor: gridBorderColor, strokeDashArray: 0, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } }, padding: { top: 0, right: 30, bottom: 0, left: 10 } },
        legend: { show: false },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            x: { show: false },
            custom: function({ dataPointIndex }) {
                const item = chartData.fullData[dataPointIndex];
                if (!item) return '';
    
                const varianceText = item.variance > 0 ? `+${item.variance} (Undersold)` : `${item.variance} (Oversold)`;
                const varianceColor = item.variance > 0 ? 'text-blue-600' : 'text-orange-600';
    
                return `
                    <div class="p-2 rounded-lg bg-secondary-bg dark:bg-dark-secondary-bg text-primary-text dark:text-dark-primary-text font-sans text-sm border border-border-color dark:border-dark-border-color shadow-lg">
                      <div class="font-bold mb-1">${item.so}</div>
                      <div class="grid grid-cols-[auto,1fr] gap-x-4">
                          <span>Ordered Qty:</span><span class="font-semibold text-right">${item.orderQty.toLocaleString()}</span>
                          <span>Sold Qty:</span><span class="font-semibold text-right">${item.saleQty.toLocaleString()}</span>
                          <div class="col-span-2 my-1 border-t border-border-color dark:border-dark-border-color"></div>
                          <span>Variance:</span><span class="font-semibold text-right ${varianceColor}">${varianceText}</span>
                      </div>
                    </div>
                `;
            }
        },
    };

    return (
        <div className="h-full">
            <ReactApexChart options={options} series={chartData.series} type="bar" height="100%" />
        </div>
    );
};

export default VarianceBySalesOrderChart;