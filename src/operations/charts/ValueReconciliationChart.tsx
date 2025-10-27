import React, { useMemo, useContext, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { DocumentMagnifyingGlassIcon } from '../../ui/Icons';
import { ThemeContext } from '../../../contexts/ThemeContext';
import type { Order, Sale } from '../../../types';

interface ChartProps {
    orders: Order[];
    sales: Sale[];
}

const ValueReconciliationChart: React.FC<ChartProps> = React.memo(({ orders, sales }) => {
    const chartRef = useRef<ReactECharts>(null);
    const themeContext = useContext(ThemeContext);
    const isDark = themeContext?.theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';

    useEffect(() => {
        const timer = setTimeout(() => {
            chartRef.current?.getEchartsInstance().resize();
        }, 100);
        return () => clearTimeout(timer);
    }, []);
    
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

    const options: EChartsOption = useMemo(() => ({
        grid: {
            left: '3%',
            right: '4%',
            bottom: isDense ? '15%' : '5%',
            containLabel: true,
        },
        legend: {
            data: chartData.series.map(s => s.name),
            top: 'top',
            right: 'right',
            textStyle: { color: labelColor },
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            textStyle: { color: isDark ? '#f9fafb' : '#18181b' },
            formatter: (params: any) => {
                const category = params[0].name;
                const orderValue = params.find((p:any) => p.seriesName === 'Order Value (FOB)')?.value || 0;
                const saleValue = params.find((p:any) => p.seriesName === 'Sale Revenue')?.value || 0;
                const variance = saleValue - orderValue;
                
                const formattedOrderValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(orderValue);
                const formattedSaleValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(saleValue);
                const formattedVariance = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(variance);
                
                const varianceColor = variance >= 0 ? 'text-green-600' : 'text-red-600';
    
                return `
                  <div class="p-2 font-sans text-sm">
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
         dataZoom: [
            {
                type: 'slider',
                show: isDense,
                start: 0,
                end: 100,
                bottom: 10,
                height: 20,
                textStyle: { color: labelColor }
            }
        ],
        xAxis: { 
            type: 'category',
            data: chartData.categories,
            boundaryGap: false,
            axisLabel: { color: labelColor, rotate: isDense ? -45 : 0 }, 
            axisLine: { show: false }, 
            axisTick: { show: false } 
        },
        yAxis: { 
            type: 'value',
            axisLabel: { color: labelColor, formatter: (val: number) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(val) },
            splitLine: { lineStyle: { color: gridBorderColor, type: 'dashed' } }
        },
        series: [
            {
                name: 'Order Value (FOB)',
                data: chartData.series[0].data,
                type: 'line',
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 3 },
                areaStyle: {
                    color: {
                        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [{ offset: 0, color: 'rgba(59, 130, 246, 0.5)' }, { offset: 1, color: 'rgba(59, 130, 246, 0.0)' }]
                    }
                },
            },
            {
                name: 'Sale Revenue',
                data: chartData.series[1].data,
                type: 'line',
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 3 },
                 areaStyle: {
                    color: {
                        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [{ offset: 0, color: 'rgba(16, 185, 129, 0.6)' }, { offset: 1, color: 'rgba(16, 185, 129, 0.1)' }]
                    }
                },
            }
        ],
        color: ['#3B82F6', '#10B981'],
    }), [chartData, isDark, isDense, labelColor, gridBorderColor]);

    return (
        <div className="h-full" aria-label="Monthly order value vs sale revenue trend chart" role="figure" tabIndex={0}>
            <ReactECharts
                ref={chartRef}
                option={options}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
            />
        </div>
    );
});

ValueReconciliationChart.displayName = 'ValueReconciliationChart';

export default ValueReconciliationChart;