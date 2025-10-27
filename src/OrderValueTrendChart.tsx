
import React, { useMemo, useContext, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { DocumentMagnifyingGlassIcon } from './ui/Icons';
import type { Order } from '../types';
import { ThemeContext } from '../contexts/ThemeContext';
import AnimatedCounter from './ui/AnimatedCounter';

interface TrendData {
  sortKey: string; // 'YYYY-MM'
  label: string; // "Mon 'YY"
  value: number;
}

interface OrderValueTrendChartProps {
  orders: Order[];
  inModal?: boolean;
  selectedPeriodKey?: string | null;
}

const aggregateData = (orders: Order[]): TrendData[] => {
    // Guard against null, undefined, or non-array orders prop.
    if (!Array.isArray(orders)) {
        return [];
    }
    const aggregated = orders.reduce((acc, order) => {
        // Guard against null/undefined order objects or orders without a PI date.
        if (!order || !order.dateIssuePI) {
            return acc;
        }

        // Explicitly parse date string as UTC to avoid timezone issues.
        const date = new Date(order.dateIssuePI + 'T00:00:00Z');
        
        // Guard against invalid date strings that result in an "Invalid Date" object.
        if (isNaN(date.getTime())) {
            return acc;
        }

        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        const label = `${date.toLocaleString('en-US', { timeZone: 'UTC', month: 'short' })} '${String(year).slice(2)}`;

        if (!acc[key]) {
            acc[key] = { sortKey: key, label, value: 0 };
        }
        acc[key].value += order.orderValue;
        return acc;
    }, {} as Record<string, TrendData>);
    
    return Object.values(aggregated).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
};

const Stat: React.FC<{ label: string, value: number, formatter: (val: number) => string }> = ({ label, value, formatter }) => (
    <div className="text-center">
        <p className="text-xs text-secondary-text dark:text-dark-secondary-text">{label}</p>
        <p className="text-lg font-bold text-primary-text dark:text-dark-primary-text">
            <AnimatedCounter to={value} formatter={formatter} />
        </p>
    </div>
);


const ChartComponent: React.FC<OrderValueTrendChartProps> = ({ orders, inModal = false, selectedPeriodKey }) => {
    const themeContext = useContext(ThemeContext);
    const chartRef = useRef<ReactECharts>(null);
    const isDark = themeContext?.theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';

    const data = useMemo(() => aggregateData(orders), [orders]);

    const { summaryStats, movingAverageData } = useMemo(() => {
        if (data.length === 0) {
            return { summaryStats: { min: 0, max: 0, avg: 0, median: 0 }, movingAverageData: [] };
        }
        const values = data.map(d => d.value);
        const sortedValues = [...values].sort((a, b) => a - b);
        const stats = {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((sum, v) => sum + v, 0) / values.length,
            median: sortedValues[Math.floor(sortedValues.length / 2)],
        };
        
        const maData: (number | null)[] = [];
        const maPeriod = 3;
        for (let i = 0; i < data.length; i++) {
            if (i < maPeriod - 1) {
                maData.push(null); // Not enough data for MA
            } else {
                const sum = data.slice(i - maPeriod + 1, i + 1).reduce((acc, curr) => acc + curr.value, 0);
                maData.push(Math.round(sum / maPeriod));
            }
        }

        return { summaryStats: stats, movingAverageData: maData };
    }, [data]);

    useEffect(() => {
        const instance = chartRef.current?.getEchartsInstance();
        if (!instance) return;

        // Reset any previous highlights
        instance.dispatchAction({ type: 'downplay' });
        
        if (selectedPeriodKey) {
            const selectedIndex = data.findIndex(d => d.sortKey === selectedPeriodKey);
            if (selectedIndex !== -1) {
                // Highlight the selected data point
                instance.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: selectedIndex });
            }
        }
    }, [selectedPeriodKey, data]);

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No orders in the selected period.</p>
            </div>
        );
    }
  
    const isDense = data.length > (inModal ? 16 : 12);

    const option: EChartsOption = useMemo(() => ({
        grid: {
            left: '3%',
            right: '4%',
            bottom: isDense ? '12%' : '5%',
            top: '15%',
            containLabel: true,
        },
        toolbox: {
            show: true,
            right: 20,
            top: 0,
            feature: {
                dataZoom: { yAxisIndex: 'none', title: { zoom: 'Area Zoom', back: 'Restore Zoom' } },
                restore: { title: 'Restore' },
                saveAsImage: { title: 'Save Image', pixelRatio: 2 }
            },
            iconStyle: {
                borderColor: labelColor
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross', crossStyle: { color: isDark ? '#555' : '#999' } },
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            textStyle: {
                color: isDark ? '#f9fafb' : '#18181b',
                fontFamily: 'Inter, sans-serif'
            },
            formatter: (params: any) => {
                if (!params || params.length === 0) return '';
                const param = params[0];
                const dataIndex = param.dataIndex;
                const currentData = data[dataIndex];
                if (!currentData) return '';
                
                let trendIndicator = '';
                if (dataIndex > 0) {
                    const prevData = data[dataIndex - 1];
                    const prevValue = prevData.value;
                    if (prevValue > 0) {
                        const change = ((currentData.value - prevValue) / prevValue) * 100;
                        const isUp = change >= 0;
                        trendIndicator = `
                            <span style="color: ${isUp ? '#10B981' : '#EF4444'}; display: flex; align-items: center; justify-content: flex-end; font-weight: 600;">
                                ${isUp ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%
                            </span>
                        `;
                    }
                }

                const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(param.value);

                return `
                  <div class="p-2 font-sans text-sm">
                    <div class="font-bold mb-1">${currentData.label}</div>
                    <div class="grid grid-cols-2 gap-x-4">
                        <span>Order Value:</span>
                        <span class="font-semibold text-right">${formattedValue}</span>
                        <span>MoM Change:</span>
                        <span class="font-semibold text-right">${trendIndicator || 'N/A'}</span>
                    </div>
                  </div>
                `;
            }
        },
        visualMap: {
            show: false,
            type: 'continuous',
            seriesIndex: 0,
            min: summaryStats.min,
            max: summaryStats.max,
            inRange: {
                color: isDark ? ['#4f46e5', '#3b82f6', '#60a5fa'] : ['#6366F1', '#3B82F6', '#60A5FA']
            }
        },
        xAxis: {
            type: 'category',
            data: data.map(d => d.label),
            axisLabel: {
                color: labelColor,
                fontSize: 12,
                rotate: isDense ? -45 : 0,
            },
            axisLine: { show: false },
            axisTick: { show: false },
            boundaryGap: false,
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: labelColor,
                fontSize: 12,
                formatter: (val: number) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(val),
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: gridBorderColor,
                    type: 'dashed'
                }
            },
            min: 0,
        },
        dataZoom: [
            {
                type: 'slider',
                show: isDense,
                start: data.length > 12 ? Math.max(0, 100 - (12 / data.length * 100)) : 0,
                end: 100,
                bottom: 10,
                height: 20,
                textStyle: { color: labelColor }
            },
            {
                type: 'inside',
                start: 0,
                end: 100,
            }
        ],
        series: [
        {
            name: 'Order Value',
            type: 'line',
            smooth: true,
            data: data.map(d => Math.round(d.value)),
            showSymbol: false,
            emphasis: {
                focus: 'series',
                itemStyle: { 
                    borderWidth: 2,
                    borderColor: '#fff',
                    shadowBlur: 5,
                    shadowColor: 'rgba(0,0,0,0.3)'
                }
            },
            lineStyle: {
                width: 3,
                shadowColor: 'rgba(0, 0, 0, 0.3)',
                shadowBlur: 10,
                shadowOffsetY: 8
            },
            areaStyle: {
                color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [{
                        offset: 0, color: isDark ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.4)'
                    }, {
                        offset: 1, color: isDark ? 'rgba(59, 130, 246, 0)' : 'rgba(59, 130, 246, 0)'
                    }]
                },
                shadowColor: 'rgba(0,0,0,0.1)',
                shadowBlur: 10
            },
            markLine: {
                silent: true,
                symbol: 'none',
                data: [{
                    yAxis: summaryStats.avg,
                    name: 'Average',
                    lineStyle: { type: 'dashed', color: isDark ? '#FBBF24' : '#F59E0B' },
                    label: {
                        formatter: 'Avg: ${c}',
                        position: 'insideEndTop',
                        color: isDark ? '#FBBF24' : '#D97706'
                    }
                }]
            },
            markPoint: {
                symbol: 'pin',
                symbolSize: 50,
                data: [
                    { type: 'max', name: 'Max', itemStyle: { color: isDark ? '#34D399' : '#10B981' } },
                    { type: 'min', name: 'Min', itemStyle: { color: isDark ? '#F87171' : '#EF4444' } }
                ],
                label: {
                    formatter: (params: any) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(params.value)
                }
            }
        },
        {
            name: '3-Period MA',
            type: 'line',
            data: movingAverageData,
            smooth: true,
            showSymbol: false,
            lineStyle: {
                width: 2,
                type: 'dashed',
                color: isDark ? '#F472B6' : '#EC4899'
            },
            tooltip: {
                valueFormatter: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value as number)
            }
        }],
  }), [data, isDark, isDense, labelColor, gridBorderColor, selectedPeriodKey, summaryStats, movingAverageData]);

    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);

  return (
    <div className="w-full h-full flex flex-col" aria-label="Monthly order value trend chart" role="figure" tabIndex={0}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 pb-2 border-b border-border-color dark:border-dark-border-color mb-2">
            <Stat label="Average" value={summaryStats.avg} formatter={currencyFormatter} />
            <Stat label="Median" value={summaryStats.median} formatter={currencyFormatter} />
            <Stat label="Highest" value={summaryStats.max} formatter={currencyFormatter} />
            <Stat label="Lowest" value={summaryStats.min} formatter={currencyFormatter} />
        </div>
        <div className="flex-grow min-h-0">
            <ReactECharts
                ref={chartRef}
                option={option}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
            />
        </div>
    </div>
  );
};


const OrderValueTrendChart = React.forwardRef<HTMLDivElement, OrderValueTrendChartProps>(({ orders, inModal = false, selectedPeriodKey }, ref) => {

    if (inModal) {
        return (
             <div className="h-full w-full flex flex-col">
                <div className="flex-grow min-h-0"><ChartComponent orders={orders} inModal selectedPeriodKey={selectedPeriodKey}/></div>
            </div>
        );
    }
    
    return (
        <div ref={ref} className="w-full h-full">
            <ChartComponent orders={orders} selectedPeriodKey={selectedPeriodKey} />
        </div>
    );
});

OrderValueTrendChart.displayName = 'OrderValueTrendChart';

export default OrderValueTrendChart;
