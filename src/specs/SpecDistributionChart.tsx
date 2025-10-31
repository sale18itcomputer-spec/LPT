
import React, { useMemo, useContext, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { ThemeContext } from '../../contexts/ThemeContext';
import { DocumentMagnifyingGlassIcon } from '../ui/Icons';
import { SpecificationBreakdown } from '../../types';

type SpecKey = keyof SpecificationBreakdown;

interface SpecDistributionChartProps {
    data: { name: string; value: number }[];
    chartType?: 'bar' | 'pie';
    onFilterClick: (key: SpecKey, value: string) => void;
    filterKey: SpecKey;
    activeValue: string | null;
    dataView: 'count' | 'units' | 'revenue';
}

const SpecDistributionChart: React.FC<SpecDistributionChartProps> = ({ data, chartType = 'bar', onFilterClick, filterKey, activeValue, dataView }) => {
    const chartRef = useRef<ReactECharts>(null);
    const themeContext = useContext(ThemeContext);
    const isDark = themeContext?.theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    
    const onEvents = {
        'click': (params: any) => {
            if (params.name) {
                onFilterClick(filterKey, params.name);
            }
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            chartRef.current?.getEchartsInstance().resize();
        }, 150);
        return () => clearTimeout(timer);
    }, []);

    const valueFormatter = useMemo(() => {
        if (dataView === 'revenue') {
            return (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);
        }
        return (val: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(val);
    }, [dataView]);
    
    const options: EChartsOption = useMemo(() => {
        const tooltipFormatter = (params: any) => {
            const p = Array.isArray(params) ? params[0] : params;
            const name = p.name;
            const value = p.value;
            const percent = p.percent;
            let result = `${name}: <strong>${valueFormatter(value)}</strong>`;
            if (percent !== undefined) {
                result += ` (${percent}%)`;
            }
            return result;
        };

        if (chartType === 'pie') {
            return {
                tooltip: { trigger: 'item', formatter: tooltipFormatter },
                color: isDark
                    ? ['#60a5fa', '#818cf8', '#a78bfa', '#f472b6', '#fb923c', '#facc15']
                    : ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#f59e0b'],
                series: [{
                    name: 'Distribution',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    label: { 
                        show: true, 
                        formatter: (params) => {
                             if (params.percent && params.percent < 5) return '';
                             return `${params.name}\n(${params.percent}%)`;
                        },
                        color: labelColor,
                        minMargin: 5,
                        edgeDistance: 10,
                        lineHeight: 14
                    },
                    labelLine: { length: 10, length2: 10 },
                    data: data.map(d => ({
                        ...d,
                        itemStyle: {
                            opacity: activeValue && activeValue !== d.name ? 0.4 : 1,
                            borderColor: activeValue === d.name ? (isDark ? '#a78bfa' : '#8b5cf6') : 'transparent',
                            borderWidth: activeValue === d.name ? 4 : 0,
                        },
                    })),
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }]
            };
        }
        
        // Bar chart options
        return {
            grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true },
            xAxis: {
                type: 'value',
                boundaryGap: [0, 0.01],
                axisLabel: { color: labelColor, formatter: (val: number) => valueFormatter(val) },
            },
            yAxis: {
                type: 'category',
                data: data.map(d => d.name).reverse(),
                axisLabel: { color: labelColor, interval: 0 },
            },
            series: [{
                name: 'Count',
                type: 'bar',
                data: data.map(d => ({
                    value: d.value,
                    name: d.name,
                    itemStyle: {
                        borderRadius: [0, 4, 4, 0],
                        color: d.name === activeValue 
                            ? (isDark ? '#a78bfa' : '#8b5cf6') 
                            : {
                                type: 'linear' as const, x: 0, y: 0, x2: 1, y2: 0,
                                colorStops: isDark
                                    ? [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#60a5fa' }]
                                    : [{ offset: 0, color: '#2563eb' }, { offset: 1, color: '#3b82f6' }]
                              },
                    }
                })).reverse(),
                label: {
                    show: true,
                    position: 'right',
                    formatter: (params: any) => valueFormatter(params.value),
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    fontWeight: 'bold',
                }
            }],
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: tooltipFormatter }
        };

    }, [data, chartType, isDark, labelColor, activeValue, valueFormatter]);

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No data for this component.</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <ReactECharts
                ref={chartRef}
                option={options}
                style={{ height: '100%', width: '100%' }}
                onEvents={onEvents}
                notMerge={true}
                lazyUpdate={true}
            />
        </div>
    );
};

export default SpecDistributionChart;
