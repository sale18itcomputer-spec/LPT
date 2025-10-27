import React, { useMemo, useContext, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { DocumentMagnifyingGlassIcon } from '../../ui/Icons';
import type { Sale } from '../../../types';
import { ThemeContext } from '../../../contexts/ThemeContext';

const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
const compactCurrencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);
const compactNumberFormatter = (val: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(val);


interface TopBuyersChartProps {
  data: { name: string; value: number; revenue: number; units: number }[];
  sortBy: 'revenue' | 'units';
  onBuyerSelect: (buyer: string | null) => void;
  selectedBuyer: string | null;
  itemCount: number;
}

const TopBuyersChart: React.FC<TopBuyersChartProps> = ({ data, sortBy, onBuyerSelect, selectedBuyer, itemCount }) => {
    const themeContext = useContext(ThemeContext);
    const { theme } = themeContext!;
    const isDark = theme === 'dark';
    const [isExpanded, setIsExpanded] = useState(false);

    // Enhanced blue color scheme
    const labelColor = isDark ? '#e0e7ff' : '#1e40af';
    const secondaryTextColor = isDark ? '#a5b4fc' : '#6366f1';
    const dataLabelColor = isDark ? '#f0f9ff' : '#1e3a8a';

    const { sortedData, totalRevenueInPeriod, totalUnitsInPeriod } = useMemo(() => {
        const totalRevenueInPeriod = data.reduce((sum, item) => sum + item.revenue, 0);
        const totalUnitsInPeriod = data.reduce((sum, item) => sum + item.units, 0);
            
        return { sortedData: data, totalRevenueInPeriod, totalUnitsInPeriod };
    }, [data]);
    
    const chartData = useMemo(() => {
        return isExpanded ? sortedData : sortedData.slice(0, itemCount);
    }, [sortedData, isExpanded, itemCount]);


    if (chartData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-secondary-text p-4 text-center">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No buyer data available.</p>
            </div>
        );
    }
    
    const option: EChartsOption = useMemo(() => {
        const reversedChartData = [...chartData].reverse();
        const maxValue = chartData[0]?.value ?? 1;

        return {
            grid: {
                left: '2%',
                right: '16%',
                bottom: '3%',
                top: '3%',
                containLabel: true,
            },
            xAxis: { 
                type: 'value', 
                show: false,
                max: maxValue * 1.05,
            },
            yAxis: {
                type: 'category',
                data: reversedChartData.map(d => d.name),
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    formatter: (value: string, index: number) => {
                        const rank = chartData.length - index;
                        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
                        return `{rank|${rank}.} ${medal ? `{medal|${medal}} ` : ''}{name|${value}}`;
                    },
                    rich: {
                        rank: { 
                            color: secondaryTextColor, 
                            width: 28, 
                            align: 'right', 
                            fontWeight: 700,
                            fontSize: 13,
                        },
                        medal: { 
                            width: 20, 
                            align: 'center', 
                            fontSize: 16,
                        },
                        name: { 
                            color: labelColor, 
                            align: 'left', 
                            fontWeight: 600,
                            fontSize: 14,
                            padding: [0, 0, 0, 4],
                        }
                    },
                    width: 170,
                    overflow: 'truncate',
                },
            },
            series: [
                {
                    name: sortBy,
                    type: 'bar',
                    data: reversedChartData.map((item, index) => {
                        const rank = chartData.length - index;
                        const isSelected = selectedBuyer === item.name;
                        const isOtherSelected = selectedBuyer && selectedBuyer !== item.name;
                        
                        return {
                            value: item.value,
                            name: item.name,
                            itemStyle: { 
                                opacity: isOtherSelected ? 0.25 : 1,
                                shadowBlur: isSelected ? 15 : 8,
                                shadowColor: isDark ? 'rgba(96, 165, 250, 0.5)' : 'rgba(59, 130, 246, 0.3)',
                                shadowOffsetY: isSelected ? 3 : 2,
                            },
                            emphasis: { 
                                itemStyle: { 
                                    opacity: 1,
                                    shadowBlur: 20,
                                    shadowColor: isDark ? 'rgba(96, 165, 250, 0.7)' : 'rgba(59, 130, 246, 0.5)',
                                    shadowOffsetY: 4,
                                } 
                            }
                        }
                    }),
                    barWidth: '65%',
                    label: {
                        show: true,
                        position: 'right',
                        formatter: (params: any) => {
                            if (sortBy === 'revenue') {
                                const percent = totalRevenueInPeriod > 0 ? (params.value / totalRevenueInPeriod) * 100 : 0;
                                return `{value|${compactCurrencyFormatter(params.value)}} {percent|${percent.toFixed(0)}%}`;
                            } else {
                                const percent = totalUnitsInPeriod > 0 ? (params.value / totalUnitsInPeriod) * 100 : 0;
                                return `{value|${compactNumberFormatter(params.value)}} {percent|${percent.toFixed(0)}%}`;
                            }
                        },
                        rich: {
                            value: { 
                                color: dataLabelColor, 
                                fontWeight: 'bold',
                                fontSize: 15,
                            },
                            percent: { 
                                color: secondaryTextColor, 
                                fontSize: 13,
                                fontWeight: 600,
                                padding: [0, 0, 0, 8]
                            },
                        },
                        distance: 12,
                    },
                    showBackground: true,
                    backgroundStyle: {
                        color: isDark ? 'rgba(30, 58, 138, 0.15)' : 'rgba(219, 234, 254, 0.5)',
                        borderRadius: [0, 12, 12, 0],
                    },
                    itemStyle: {
                        color: {
                            type: 'linear', 
                            x: 0, 
                            y: 0, 
                            x2: 1, 
                            y2: 0,
                            colorStops: isDark 
                                ? [
                                    { offset: 0, color: '#3b82f6' },
                                    { offset: 0.5, color: '#2563eb' },
                                    { offset: 1, color: '#1d4ed8' }
                                ]
                                : [
                                    { offset: 0, color: '#60a5fa' },
                                    { offset: 0.5, color: '#3b82f6' },
                                    { offset: 1, color: '#2563eb' }
                                ]
                        },
                        borderRadius: [0, 12, 12, 0],
                    },
                    emphasis: {
                        focus: 'self',
                        itemStyle: {
                            color: {
                                type: 'linear',
                                x: 0,
                                y: 0,
                                x2: 1,
                                y2: 0,
                                colorStops: isDark
                                    ? [
                                        { offset: 0, color: '#60a5fa' },
                                        { offset: 0.5, color: '#3b82f6' },
                                        { offset: 1, color: '#2563eb' }
                                    ]
                                    : [
                                        { offset: 0, color: '#3b82f6' },
                                        { offset: 0.5, color: '#2563eb' },
                                        { offset: 1, color: '#1e40af' }
                                    ]
                            },
                        }
                    },
                    blur: {
                        itemStyle: { opacity: 0.25 }
                    },
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
                textStyle: { 
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    fontSize: 13,
                },
                padding: [12, 16],
                extraCssText: 'border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);',
                formatter: (params: any) => {
                    const item = sortedData.find(d => d.name === params.name);
                    if (!item) return '';
                    const rank = sortedData.indexOf(item) + 1;
                    const revenuePercent = totalRevenueInPeriod > 0 ? (item.revenue / totalRevenueInPeriod) * 100 : 0;
                    
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                    const rankColor = isDark ? '#60a5fa' : '#2563eb';
                    
                    return `
                        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 280px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <span style="font-size: 18px;">${rank <= 3 ? medal : ''}</span>
                                <div>
                                    <div style="font-weight: 700; font-size: 15px; color: ${isDark ? '#f1f5f9' : '#0f172a'};">${params.name}</div>
                                    <div style="font-size: 11px; color: ${rankColor}; font-weight: 600;">${rank <= 3 ? '' : medal + ' Rank'}</div>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; gap: 24px; margin-top: 8px;">
                                <span style="color: ${isDark ? '#cbd5e1' : '#475569'};">Revenue:</span>
                                <span style="font-weight: 700; color: ${isDark ? '#60a5fa' : '#2563eb'};">${currencyFormatter(item.revenue)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; gap: 24px; margin-top: 4px;">
                                <span style="color: ${isDark ? '#cbd5e1' : '#475569'};">Units:</span>
                                <span style="font-weight: 700; color: ${isDark ? '#f1f5f9' : '#0f172a'};">${item.units.toLocaleString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; gap: 24px; margin-top: 4px;">
                                <span style="color: ${isDark ? '#cbd5e1' : '#475569'};">Market Share:</span>
                                <span style="font-weight: 700; color: ${isDark ? '#a5b4fc' : '#6366f1'};">${revenuePercent.toFixed(1)}%</span>
                            </div>
                        </div>
                    `;
                },
            }
        };
    }, [chartData, selectedBuyer, isDark, labelColor, secondaryTextColor, dataLabelColor, totalRevenueInPeriod, totalUnitsInPeriod, sortBy, sortedData]);

    const onEvents = {
        'click': (params: any) => {
            onBuyerSelect(selectedBuyer === params.name ? null : params.name);
        }
    };

    const canExpand = sortedData.length > itemCount;

    return (
        <div className="h-full flex flex-col">
            <div className="flex-grow">
                <ReactECharts
                    option={option}
                    style={{ height: `${chartData.length * 65}px`, width: '100%' }}
                    onEvents={onEvents}
                    notMerge={true}
                    lazyUpdate={true}
                />
            </div>
            {canExpand && (
                <div className="text-center pt-4 pb-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
                        style={{
                            background: isDark 
                                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                                : 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                            color: '#ffffff',
                        }}
                    >
                        {isExpanded ? '↑ Show Less' : `↓ Show ${sortedData.length - itemCount} More`}
                    </button>
                </div>
            )}
        </div>
    );
};

export default TopBuyersChart;
