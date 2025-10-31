
import React, { useMemo, useContext, useRef, useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentMagnifyingGlassIcon, ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, TableCellsIcon, ChevronUpIcon, ChevronDownIcon, CalendarDaysIcon, Cog8ToothIcon as Squares2X2Icon } from './ui/Icons';
import type { Order, Sale } from '../types';
import { ThemeContext } from '../contexts/ThemeContext';
import AnimatedCounter from './ui/AnimatedCounter';
import SegmentedControl from './ui/SegmentedControl';
import { getISOWeek } from '../utils/dateHelpers';

interface TrendData {
  sortKey: string; 
  label: string;
  value: number;
}

type Granularity = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface OrderValueTrendChartProps {
  data: (Order | Sale)[];
}

const aggregateData = (data: (Order | Sale)[], granularity: Granularity): TrendData[] => {
    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }

    const isSaleData = 'invoiceDate' in data[0];

    const aggregated = data.reduce((acc, item) => {
        const dateString = isSaleData ? (item as Sale).invoiceDate : (item as Order).dateIssuePI;
        const value = isSaleData ? (item as Sale).totalRevenue : (item as Order).orderValue;

        if (!dateString) return acc;
        
        const date = new Date(dateString + 'T00:00:00Z');
        if (isNaN(date.getTime())) return acc;

        let key = '', label = '', sortKey = '';
        
        switch(granularity) {
            case 'daily': {
                sortKey = date.toISOString().split('T')[0];
                label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                key = sortKey;
                break;
            }
            case 'weekly': {
                const year = date.getUTCFullYear();
                const week = getISOWeek(date);
                sortKey = `${year}-W${String(week).padStart(2, '0')}`;
                label = `W${week}, ${year}`;
                key = sortKey;
                break;
            }
            case 'monthly': {
                const mYear = date.getUTCFullYear();
                const month = date.getUTCMonth();
                sortKey = `${mYear}-${String(month + 1).padStart(2, '0')}`;
                label = `${date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} '${String(mYear).slice(2)}`;
                key = sortKey;
                break;
            }
            case 'quarterly': {
                const qYear = date.getUTCFullYear();
                const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
                sortKey = `${qYear}-Q${quarter}`;
                label = `Q${quarter} ${qYear}`;
                key = sortKey;
                break;
            }
            case 'yearly': {
                const yYear = date.getUTCFullYear();
                sortKey = `${yYear}`;
                label = `${yYear}`;
                key = sortKey;
                break;
            }
        }

        if (!acc[key]) {
            acc[key] = { sortKey, label, value: 0 };
        }
        acc[key].value += value;
        return acc;
    }, {} as Record<string, TrendData>);
    
    const allAggregated = Object.values(aggregated)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    if (granularity === 'daily' || granularity === 'weekly') {
        const currentYear = new Date().getUTCFullYear();
        return allAggregated.filter(item => item.sortKey.startsWith(String(currentYear)));
    }

    const limit = {
        monthly: 24,
        quarterly: 12,
        yearly: 10,
    }[granularity as 'monthly' | 'quarterly' | 'yearly'];
    
    return allAggregated.slice(-limit);
};


const Stat: React.FC<{ label: string, value: number, formatter: (val: number) => string, trend?: number | null }> = ({ label, value, formatter, trend }) => {
    const isPositive = trend !== null && trend !== undefined && trend >= 0;
    return (
        <div className="text-center">
            <p className="text-xs text-secondary-text dark:text-dark-secondary-text">{label}</p>
            {trend !== null && trend !== undefined ? (
                 <div className={`text-lg font-bold flex items-center justify-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? <ArrowTrendingUpIcon className="h-4 w-4 mr-0.5"/> : <ArrowTrendingDownIcon className="h-4 w-4 mr-0.5"/>}
                    <span>{Math.abs(trend).toFixed(1)}%</span>
                </div>
            ) : (
                <p className="text-lg font-bold text-primary-text dark:text-dark-primary-text">
                    <AnimatedCounter to={value} formatter={formatter} />
                </p>
            )}
        </div>
    );
};


const OrderValueTrendChart: React.FC<OrderValueTrendChartProps> = ({ data }) => {
    const [chartType, setChartType] = useState<'line' | 'bar' | 'table' | 'calendar' | 'treemap'>('bar');
    const [granularity, setGranularity] = useState<Granularity>('daily');
    const themeContext = useContext(ThemeContext);
    const chartRef = useRef<ReactECharts>(null);
    const isDark = themeContext?.theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';

    const trendData = useMemo(() => aggregateData(data, granularity), [data, granularity]);

    const { summaryStats, movingAverageData, dataWithGrowth } = useMemo(() => {
        if (trendData.length === 0) {
            return { summaryStats: { min: 0, max: 0, avg: 0, median: 0, growth: null }, movingAverageData: [], dataWithGrowth: [] };
        }
        const values = trendData.map(d => d.value);
        const sortedValues = [...values].sort((a, b) => a - b);
        const firstValue = values[0];
        const lastValue = values[values.length - 1];
        
        const stats = {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((sum, v) => sum + v, 0) / values.length,
            median: sortedValues[Math.floor(sortedValues.length / 2)],
            growth: firstValue > 0 && trendData.length > 1 ? ((lastValue - firstValue) / firstValue) * 100 : null,
        };
        
        const maData: (number | null)[] = [];
        const maPeriod = 3;
        for (let i = 0; i < trendData.length; i++) {
            if (i < maPeriod - 1) {
                maData.push(null);
            } else {
                const sum = trendData.slice(i - maPeriod + 1, i + 1).reduce((acc, curr) => acc + curr.value, 0);
                maData.push(Math.round(sum / maPeriod));
            }
        }
        
        const dataWithGrowth = trendData.map((item, index) => {
            const prev = trendData[index - 1];
            const growth = (prev && prev.value > 0) ? ((item.value - prev.value) / prev.value) * 100 : null;
            return { ...item, growth };
        });

        return { summaryStats: stats, movingAverageData: maData, dataWithGrowth };
    }, [trendData]);


    useEffect(() => {
        const instance = chartRef.current?.getEchartsInstance();
        if (!instance) return;
        instance.dispatchAction({ type: 'downplay' });
    }, [trendData]);
    
    useEffect(() => {
        if (granularity !== 'daily' && chartType === 'calendar') {
            setChartType('bar');
        }
    }, [granularity, chartType]);

    const TableView: React.FC<{ data: (TrendData & { growth: number | null })[], average: number }> = ({ data, average }) => {
        const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
        const maxDiff = Math.max(...data.map(d => Math.abs(d.value - average)), 1);

        return (
            <div className="h-full overflow-y-auto custom-scrollbar px-4">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-secondary-bg/80 dark:bg-dark-secondary-bg/80 backdrop-blur-sm z-10">
                        <tr>
                            <th className="py-2 px-3 text-left text-xs font-semibold text-secondary-text dark:text-dark-secondary-text">Period</th>
                            <th className="py-2 px-3 text-right text-xs font-semibold text-secondary-text dark:text-dark-secondary-text">Revenue</th>
                            <th className="py-2 px-3 text-right text-xs font-semibold text-secondary-text dark:text-dark-secondary-text">% Change</th>
                            <th className="py-2 px-3 text-left text-xs font-semibold text-secondary-text dark:text-dark-secondary-text w-48">vs. Average</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color dark:divide-dark-border-color">
                        {data.map(item => {
                            const isPositiveGrowth = item.growth !== null && item.growth >= 0;
                            const vsAvg = item.value - average;
                            const percentage = (Math.abs(vsAvg) / maxDiff) * 100;
                            const isAboveAvg = vsAvg >= 0;

                            return (
                                <tr key={item.sortKey} className="hover:bg-gray-50/50 dark:hover:bg-dark-primary-bg/30">
                                    <td className="py-2 px-3 font-medium text-primary-text dark:text-dark-primary-text">{item.label}</td>
                                    <td className="py-2 px-3 text-right font-medium text-primary-text dark:text-dark-primary-text">{currencyFormatter(item.value)}</td>
                                    <td className="py-2 px-3 text-right">
                                        {item.growth === null ? (
                                            <span className="text-secondary-text">—</span>
                                        ) : (
                                            <span className={`font-semibold flex items-center justify-end ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
                                                {isPositiveGrowth ? <ChevronUpIcon className="h-3 w-3 mr-0.5" /> : <ChevronDownIcon className="h-3 w-3 mr-0.5" />}
                                                {Math.abs(item.growth).toFixed(1)}%
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-2 px-3">
                                        <div className="flex items-center gap-2" title={`vs. Avg: ${currencyFormatter(vsAvg)}`}>
                                            <div className="w-full bg-gray-200 dark:bg-dark-border-color rounded-full h-1.5 relative">
                                                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-400 dark:bg-gray-500"></div>
                                                <div 
                                                    className={`absolute top-0 bottom-0 h-1.5 rounded-full ${isAboveAvg ? 'bg-green-500' : 'bg-red-500'}`}
                                                    style={{
                                                        width: `${percentage / 2}%`,
                                                        left: isAboveAvg ? '50%' : `${50 - percentage / 2}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    if (trendData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No data in the selected period.</p>
            </div>
        );
    }
  
    const currencyCompactFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);
    
    const getGrowthColor = (growth: number | null, isDark: boolean): string => {
        const positiveColors = isDark ? ['#15803d', '#16a34a', '#22c55e'] : ['#14532d', '#15803d', '#16a34a'];
        const negativeColors = isDark ? ['#b91c1c', '#dc2626', '#ef4444'] : ['#7f1d1d', '#b91c1c', '#dc2626'];
        const neutralColor = isDark ? '#52525b' : '#a1a1aa';

        if (growth === null || Math.abs(growth) < 0.1) return neutralColor;
        if (growth > 0) {
            if (growth > 50) return positiveColors[2];
            if (growth > 10) return positiveColors[1];
            return positiveColors[0];
        } else {
            if (growth < -50) return negativeColors[2];
            if (growth < -10) return negativeColors[1];
            return negativeColors[0];
        }
    };

    const option: EChartsOption = useMemo(() => {
        if (chartType === 'treemap') {
            return {
                tooltip: {
                    formatter: (params: any) => {
                        const { name, value, data } = params;
                        const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
                        let growthHtml = '<span>N/A</span>';
                        if (data.growth !== null && data.growth !== undefined) {
                            const isPositive = data.growth >= 0;
                            growthHtml = `<span style="color: ${isPositive ? '#10B981' : '#EF4444'}; font-weight: 600;">${isPositive ? '▲' : '▼'} ${Math.abs(data.growth).toFixed(1)}%</span>`;
                        }
                        return `<div class="p-2 font-sans text-sm" style="min-width: 150px;">
                                <strong class="block mb-1">${name}</strong>
                                <div class="flex justify-between"><span>Revenue:</span> <span class="font-semibold">${formattedValue}</span></div>
                                <div class="flex justify-between"><span>Growth:</span> ${growthHtml}</div>
                            </div>`;
                    },
                    backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: isDark ? '#3f3f46' : '#e4e4e7',
                    textStyle: { color: isDark ? '#f9fafb' : '#18181b' }
                },
                series: [{
                    type: 'treemap',
                    data: dataWithGrowth.map(d => ({
                        name: d.label,
                        value: d.value,
                        growth: d.growth,
                        itemStyle: {
                            color: getGrowthColor(d.growth, isDark),
                            borderRadius: 6,
                        }
                    })),
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold',
                        formatter: (params: any) => {
                            if (params.treePathInfo.length > 1 || params.value < summaryStats.avg / 5) return '';
                            const formattedValue = currencyCompactFormatter(params.value);
                            return `${params.name}\n${formattedValue}`;
                        },
                        color: '#fff',
                        textShadowBlur: 2,
                        textShadowColor: 'rgba(0, 0, 0, 0.4)',
                    },
                    upperLabel: { show: false },
                    itemStyle: {
                        gapWidth: 4,
                        borderColor: isDark ? '#27272a' : '#FFFFFF',
                    },
                    breadcrumb: { show: false },
                    levels: [{ itemStyle: { borderColor: isDark ? '#18181b' : '#fff', borderWidth: 3, gapWidth: 4 } }],
                }]
            };
        }

        if (chartType === 'calendar') {
            if (granularity !== 'daily' || trendData.length === 0) {
                return {};
            }
    
            const calendarRange = [trendData[0].sortKey, trendData[trendData.length - 1].sortKey];
    
            return {
                tooltip: {
                    formatter: (params: any) => {
                        const data = params.value;
                        if (!data || data.length < 2) return '';
                        const date = data[0];
                        const value = data[1];
                        const formattedDate = new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
                        const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
                        return `<div class="p-2 font-sans text-sm">
                                    <strong>${formattedDate}</strong><br/>
                                    Revenue: <span class="font-semibold">${formattedValue}</span>
                                </div>`;
                    },
                    backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: isDark ? '#3f3f46' : '#e4e4e7',
                    textStyle: { color: isDark ? '#f9fafb' : '#18181b' }
                },
                visualMap: {
                    min: 0,
                    max: summaryStats.max,
                    calculable: true,
                    orient: 'horizontal',
                    left: 'center',
                    bottom: 10,
                    inRange: {
                        color: isDark
                            ? ['#1e293b', '#1d4ed8', '#3b82f6', '#93c5fd']
                            : ['#eff6ff', '#60a5fa', '#2563eb', '#1e3a8a']
                    },
                    textStyle: { color: labelColor }
                },
                calendar: {
                    range: calendarRange,
                    top: 70,
                    left: 'center',
                    width: '90%',
                    cellSize: 'auto',
                    splitLine: {
                        show: true,
                        lineStyle: { color: gridBorderColor, width: 1, type: 'solid' }
                    },
                    dayLabel: { nameMap: 'en', firstDay: 1 },
                    monthLabel: { nameMap: 'en', position: 'end' },
                    itemStyle: {
                        color: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                        borderColor: isDark ? '#3f3f46' : '#e2e8f0',
                        borderWidth: 1
                    },
                    yearLabel: { show: true }
                },
                series: {
                    type: 'heatmap',
                    coordinateSystem: 'calendar',
                    data: trendData.map(d => [d.sortKey, d.value])
                }
            };
        }

        const isDense = trendData.length > 12;

        const revenueSeriesBase = {
            name: 'Revenue',
            data: trendData.map(d => Math.round(d.value)),
            markLine: {
                silent: true,
                symbol: 'none' as const,
                data: [{
                    yAxis: summaryStats.avg,
                    name: 'Average',
                    lineStyle: { type: 'dashed' as const, color: isDark ? '#FBBF24' : '#F59E0B' },
                    label: {
                        formatter: 'Avg: ${c}',
                        position: 'insideEndTop' as const,
                        color: isDark ? '#FBBF24' : '#D97706'
                    }
                }]
            }
        };

        let revenueSeries;

        switch (chartType) {
            case 'line':
                revenueSeries = {
                    ...revenueSeriesBase,
                    type: 'line' as const,
                    smooth: true,
                    showSymbol: false,
                    color: isDark ? '#60a5fa' : '#3b82f6',
                    emphasis: { focus: 'series' as const, lineStyle: { width: 4 } },
                    lineStyle: { width: 3, shadowColor: 'rgba(0, 0, 0, 0.3)', shadowBlur: 10, shadowOffsetY: 8 },
                };
                break;
            case 'bar':
                revenueSeries = {
                    ...revenueSeriesBase,
                    type: 'bar' as const,
                    barWidth: '60%',
                    emphasis: { focus: 'series' as const, itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
                    itemStyle: {
                        borderRadius: [4, 4, 0, 0],
                        color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: isDark ? [{ offset: 0, color: '#60a5fa' }, { offset: 1, color: '#3b82f6' }] : [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#2563eb' }] }
                    }
                };
                break;
        }

        return {
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
                    const dataIndex = params[0].dataIndex;
                    const currentData = trendData[dataIndex];
                    if (!currentData) return '';
                    
                    let trendIndicator = '';
                    if (dataIndex > 0) {
                        const prevData = trendData[dataIndex - 1];
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

                    const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params[0].value);

                    return `
                      <div class="p-2 font-sans text-sm">
                        <div class="font-bold mb-1">${currentData.label}</div>
                        <div class="grid grid-cols-2 gap-x-4">
                            <span>Revenue:</span>
                            <span class="font-semibold text-right">${formattedValue}</span>
                            <span>Change:</span>
                            <span class="font-semibold text-right">${trendIndicator || 'N/A'}</span>
                        </div>
                      </div>
                    `;
                }
            },
            xAxis: {
                type: 'category',
                data: trendData.map(d => d.label),
                axisLabel: {
                    color: labelColor,
                    fontSize: 12,
                    rotate: isDense ? -45 : 0,
                },
                axisLine: { show: false },
                axisTick: { show: false },
                boundaryGap: chartType === 'bar',
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
                    show: true, // Always show the slider for better UX
                    start: trendData.length > 30 ? Math.max(0, 100 - (30 / trendData.length * 100)) : 0,
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
                revenueSeries as any,
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
        }
    }, [trendData, isDark, chartType, labelColor, gridBorderColor, summaryStats, movingAverageData, dataWithGrowth, granularity]);

    
     const granularityOptions = [
        { label: 'Daily', value: 'daily' as const },
        { label: 'Weekly', value: 'weekly' as const },
        { label: 'Monthly', value: 'monthly' as const },
        { label: 'Quarterly', value: 'quarterly' as const },
        { label: 'Yearly', value: 'yearly' as const },
    ];
    
    const viewOptions = [
        { label: 'Line', value: 'line' as const, icon: ArrowTrendingUpIcon },
        { label: 'Bar', value: 'bar' as const, icon: ChartBarIcon },
        { label: 'Calendar', value: 'calendar' as const, icon: CalendarDaysIcon, disabled: granularity !== 'daily' },
        { label: 'Treemap', value: 'treemap' as const, icon: Squares2X2Icon },
        { label: 'Table', value: 'table' as const, icon: TableCellsIcon },
    ];

  return (
    <div className="w-full h-full flex flex-col" aria-label={`Order value trend by ${granularity}`} role="figure" tabIndex={0}>
        <div className="flex justify-between items-start gap-4 px-4 pb-2 border-b border-border-color dark:border-dark-border-color mb-2">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-2 flex-grow">
                <Stat label="Average" value={summaryStats.avg} formatter={currencyCompactFormatter} />
                <Stat label="Median" value={summaryStats.median} formatter={currencyCompactFormatter} />
                <Stat label="Highest" value={summaryStats.max} formatter={currencyCompactFormatter} />
                <Stat label="Lowest" value={summaryStats.min} formatter={currencyCompactFormatter} />
                <Stat label="Growth" value={0} formatter={(v) => ''} trend={summaryStats.growth}/>
            </div>
             <div className="flex flex-col gap-2 flex-shrink-0">
                 <SegmentedControl
                    label="Granularity"
                    options={granularityOptions}
                    value={granularity}
                    onChange={(val) => setGranularity(val as Granularity)}
                 />
                 <SegmentedControl
                    label="Chart Type"
                    options={viewOptions}
                    value={chartType}
                    onChange={(val) => setChartType(val as 'line' | 'bar' | 'table' | 'calendar' | 'treemap')}
                 />
            </div>
        </div>
        <div className="flex-grow min-h-0">
             <AnimatePresence mode="wait">
                <motion.div
                    key={chartType + granularity}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                >
                    {chartType === 'table' ? (
                        <TableView data={dataWithGrowth} average={summaryStats.avg} />
                    ) : (
                        <ReactECharts
                            ref={chartRef}
                            option={option}
                            style={{ height: '100%', width: '100%' }}
                            notMerge={true}
                            lazyUpdate={true}
                        />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    </div>
  );
};

const MemoizedOrderValueTrendChart = React.memo(OrderValueTrendChart);
MemoizedOrderValueTrendChart.displayName = 'OrderValueTrendChart';
export default MemoizedOrderValueTrendChart;
