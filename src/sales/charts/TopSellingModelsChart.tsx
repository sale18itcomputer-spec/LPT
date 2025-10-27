import React, { useMemo, useContext } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { DocumentMagnifyingGlassIcon } from '../../ui/Icons';
import type { Sale } from '../../../types';
import { ThemeContext } from '../../../contexts/ThemeContext';

const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
const compactCurrencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);
const compactNumberFormatter = (val: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(val);

type SortBy = 'revenue' | 'units';

interface TopSellingModelsChartProps {
  data: {
    name: string; // mtm
    modelName: string;
    revenue: number;
    units: number;
    value: number; // The value to sort by (either revenue or units)
  }[];
  sortBy: SortBy;
  onModelSelect: (mtm: string | null) => void;
  selectedModel: string | null;
  itemCount: number;
  profitByMtm: Map<string, { totalProfit: number; totalRevenue: number }>;
}

const TopSellingModelsChart: React.FC<TopSellingModelsChartProps> = React.memo(({ data, sortBy, onModelSelect, selectedModel, itemCount, profitByMtm }) => {
    const themeContext = useContext(ThemeContext);
    const isDark = themeContext?.theme === 'dark';

    const labelColor = isDark ? '#e0e7ff' : '#1e40af';
    const secondaryTextColor = isDark ? '#a5b4fc' : '#6366f1';
    const dataLabelColor = isDark ? '#f0f9ff' : '#1e3a8a';

    const { chartData, totalRevenueInPeriod, totalUnitsInPeriod } = useMemo(() => {
        const totalRevenueInPeriod = data.reduce((sum, item) => sum + item.revenue, 0);
        const totalUnitsInPeriod = data.reduce((sum, item) => sum + item.units, 0);

        const sortedData = data
            .map(item => {
                const profitData = profitByMtm.get(item.name);
                const profit = profitData?.totalProfit;
                const margin = (profit !== undefined && profitData?.totalRevenue > 0) ? (profit / profitData.totalRevenue) * 100 : null;
                return { ...item, profit, margin };
            })
            .slice(0, itemCount);
            
        return { chartData: sortedData, totalRevenueInPeriod, totalUnitsInPeriod };
    }, [data, itemCount, profitByMtm]);

    if (chartData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-secondary-text p-4 text-center">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No product data available.</p>
            </div>
        );
    }
    
    const option: EChartsOption = useMemo(() => {
        const reversedChartData = [...chartData].reverse();
        const maxValue = chartData[0]?.[sortBy] ?? 1;

        return {
            grid: {
                left: '2%',
                right: '14%',
                top: '3%',
                bottom: '3%',
                containLabel: true,
            },
            xAxis: {
                type: 'value',
                show: false,
                max: maxValue * 1.05,
            },
            yAxis: {
                type: 'category',
                data: reversedChartData.map(d => d.modelName),
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: labelColor,
                    fontWeight: 600,
                    fontSize: 14,
                    padding: [0, 12, 0, 0],
                    width: 160,
                    overflow: 'truncate',
                },
            },
            series: [
                {
                    name: sortBy,
                    type: 'bar',
                    barWidth: '65%',
                    data: reversedChartData.map((item) => {
                        const isSelected = selectedModel === item.name;
                        const isOtherSelected = selectedModel && selectedModel !== item.name;
                        
                        return {
                            value: item[sortBy],
                            name: item.name, // mtm
                            itemStyle: {
                                opacity: isOtherSelected ? 0.25 : 1,
                                shadowBlur: isSelected ? 15 : 0,
                                shadowColor: isDark ? 'rgba(96, 165, 250, 0.5)' : 'rgba(59, 130, 246, 0.3)',
                                shadowOffsetY: isSelected ? 3 : 0,
                            },
                        };
                    }),
                    label: {
                        show: true,
                        position: 'right',
                        formatter: (params: any) => {
                            const total = sortBy === 'revenue' ? totalRevenueInPeriod : totalUnitsInPeriod;
                            const percent = total > 0 ? (params.value / total) * 100 : 0;
                            const valueString = sortBy === 'revenue' ? compactCurrencyFormatter(params.value) : compactNumberFormatter(params.value);
                            return `{value|${valueString}} {percent|${percent.toFixed(0)}%}`;
                        },
                        rich: {
                            value: { color: dataLabelColor, fontWeight: 'bold', fontSize: 15 },
                            percent: { color: secondaryTextColor, fontSize: 13, fontWeight: 600, padding: [0, 0, 0, 8] }
                        },
                        distance: 12,
                    },
                    showBackground: true,
                    backgroundStyle: { color: isDark ? 'rgba(30, 58, 138, 0.15)' : 'rgba(219, 234, 254, 0.5)', borderRadius: [0, 12, 12, 0] },
                    itemStyle: {
                        color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: isDark ? [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#1d4ed8' }] : [{ offset: 0, color: '#60a5fa' }, { offset: 1, color: '#2563eb' }] },
                        borderRadius: [0, 12, 12, 0],
                    },
                    emphasis: { focus: 'self' },
                    blur: { itemStyle: { opacity: 0.25 } },
                    animationEasing: 'cubicOut',
                    animationDuration: 750,
                    animationDelay: (idx: number) => idx * 50,
                }
            ],
            tooltip: {
                trigger: 'item',
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                borderColor: isDark ? '#3b82f6' : '#93c5fd',
                borderWidth: 2,
                textStyle: { color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 13 },
                padding: [12, 16],
                extraCssText: 'border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);',
                formatter: (params: any) => {
                    const item = chartData.find(d => d.name === params.name);
                    if (!item) return '';
                    
                    const positiveColor = isDark ? '#10b981' : '#059669';
                    const negativeColor = isDark ? '#ef4444' : '#dc2626';
                    
                    const profitLine = item.profit !== undefined ? `<div class="grid grid-cols-2 gap-x-4 mt-1"><span class="text-slate-400">Profit:</span><span class="font-semibold text-right">${currencyFormatter(item.profit)}</span><span class="text-slate-400">Margin:</span><span class="font-semibold text-right" style="color:${item.margin === null ? 'inherit' : item.margin > 0 ? positiveColor : negativeColor};">${item.margin === null ? 'N/A' : `${item.margin.toFixed(1)}%`}</span></div>` : '';
                        
                    return `<div class="font-sans max-w-xs"><div class="font-bold text-base mb-1">${item.modelName}</div><div class="text-xs font-mono text-slate-500 mb-3">${item.name}</div><div class="grid grid-cols-2 gap-x-4"><span class="text-slate-400">Revenue:</span><span class="font-semibold text-right">${currencyFormatter(item.revenue)}</span><span class="text-slate-400">Units:</span><span class="font-semibold text-right">${item.units.toLocaleString()}</span></div>${profitLine}</div>`;
                },
            }
        };
    }, [chartData, sortBy, selectedModel, isDark, labelColor, secondaryTextColor, dataLabelColor, totalRevenueInPeriod, totalUnitsInPeriod]);

    const onEvents = {
        'click': (params: any) => {
            onModelSelect(selectedModel === params.name ? null : params.name);
        }
    };

    return (
        <div className="h-full flex flex-col" aria-label={`Top ${itemCount} selling models by ${sortBy}`} role="figure" tabIndex={0}>
            <ReactECharts
                option={option}
                style={{ height: `${chartData.length * 65}px`, width: '100%' }}
                onEvents={onEvents}
                notMerge={true}
                lazyUpdate={true}
            />
        </div>
    );
});

TopSellingModelsChart.displayName = 'TopSellingModelsChart';

export default TopSellingModelsChart;
