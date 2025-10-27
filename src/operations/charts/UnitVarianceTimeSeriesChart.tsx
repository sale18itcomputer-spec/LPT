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

const UnitVarianceTimeSeriesChart: React.FC<ChartProps> = React.memo(({ orders, sales }) => {
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
        const aggregated = new Map<string, { orderUnits: number, saleUnits: number }>();
        
        orders.forEach(order => {
            if (order.dateIssuePI) {
                const date = new Date(order.dateIssuePI);
                const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
                if (!aggregated.has(key)) aggregated.set(key, { orderUnits: 0, saleUnits: 0 });
                aggregated.get(key)!.orderUnits += order.qty;
            }
        });
        
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
                { name: 'Ordered Units', type: 'bar' as const, data: sortedKeys.map(k => aggregated.get(k)!.orderUnits) },
                { name: 'Sold Units', type: 'bar' as const, data: sortedKeys.map(k => aggregated.get(k)!.saleUnits) },
                { name: 'Net Variance', type: 'line' as const, data: sortedKeys.map(k => {
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

    const options: EChartsOption = useMemo(() => ({
        grid: {
            left: '3%',
            right: '3%',
            bottom: isDense ? '15%' : '5%',
            containLabel: true,
        },
        legend: {
            data: chartData.series.map(s => s.name),
            top: 'top',
            right: 'right',
            textStyle: { color: labelColor }
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            textStyle: { color: isDark ? '#f9fafb' : '#18181b' },
            formatter: (params: any) => {
                if (!params || params.length === 0) return '';
                const category = params[0].name;
                let tooltip = `<div class="p-1 font-sans"><div class="font-bold mb-1">${category}</div>`;
                params.forEach((p: any) => {
                    tooltip += `<div>${p.marker} ${p.seriesName}: <span class="font-semibold ml-2">${p.value.toLocaleString()} units</span></div>`;
                });
                tooltip += `</div>`;
                return tooltip;
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
            axisLabel: { color: labelColor, rotate: isDense ? -45 : 0 }, 
            axisLine: { show: false }, 
            axisTick: { show: false } 
        },
        yAxis: [
            {
                type: 'value',
                name: "Units Ordered/Sold",
                nameTextStyle: { color: labelColor },
                axisLabel: { color: labelColor },
                splitLine: { lineStyle: { color: gridBorderColor, type: 'dashed' } }
            },
            {
                type: 'value',
                name: "Net Variance",
                nameTextStyle: { color: labelColor },
                position: 'right',
                axisLine: { lineStyle: { color: '#F97316' } },
                axisLabel: { color: '#F97316' },
                splitLine: { show: false }
            }
        ],
        series: chartData.series.map(s => ({
            ...s,
            smooth: s.type === 'line' ? true : undefined,
            yAxisIndex: s.type === 'line' ? 1 : 0,
            lineStyle: s.type === 'line' ? { width: 3 } : undefined,
            showSymbol: false,
        })),
        color: ['#3B82F6', '#10B981', '#F97316'],
    }), [chartData, isDark, isDense, labelColor, gridBorderColor]);

    return (
        <div className="h-full" aria-label="Monthly unit variance time series chart" role="figure" tabIndex={0}>
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

UnitVarianceTimeSeriesChart.displayName = 'UnitVarianceTimeSeriesChart';

export default UnitVarianceTimeSeriesChart;