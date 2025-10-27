import React, { useMemo, useContext, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentMagnifyingGlassIcon, SparklesIcon, XMarkIcon } from '../../ui/Icons';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { Spinner } from '../../ui/Spinner';

interface TrendData {
  sortKey: string;
  label: string;
  value: number;
}

interface RevenueTrendChartProps {
  trendData: TrendData[];
  granularity: 'monthly' | 'quarterly';
  analysis: string | null;
  isLoadingAnalysis: boolean;
  onClearAnalysis: () => void;
  onPeriodSelect?: (periodKey: string) => void;
  selectedStartDate?: string | null;
}

const RevenueTrendChart: React.FC<RevenueTrendChartProps> = React.memo(({ trendData, granularity, analysis, isLoadingAnalysis, onClearAnalysis, onPeriodSelect, selectedStartDate }) => {
    const themeContext = useContext(ThemeContext);
    const chartRef = useRef<ReactECharts>(null);
    const isDark = themeContext?.theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';
    
    const selectedPeriodKey = useMemo(() => {
        if (!selectedStartDate) return null;
        try {
            const date = new Date(selectedStartDate + 'T00:00:00Z');
            const year = date.getUTCFullYear();
            if (granularity === 'quarterly') {
                const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
                return `${year}-Q${quarter}`;
            } else {
                const month = date.getUTCMonth();
                return `${year}-${String(month + 1).padStart(2, '0')}`;
            }
        } catch (e) {
            return null;
        }
    }, [selectedStartDate, granularity]);
    
    useEffect(() => {
        const instance = chartRef.current?.getEchartsInstance();
        if (!instance) return;

        instance.dispatchAction({ type: 'downplay', seriesIndex: 0 });

        if (selectedPeriodKey) {
            const selectedIndex = trendData.findIndex(d => d.sortKey === selectedPeriodKey);
            if (selectedIndex !== -1) {
                instance.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: selectedIndex });
            }
        }
    }, [selectedPeriodKey, trendData]);


    if (trendData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-secondary-text p-4 text-center">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No sales in the selected period.</p>
            </div>
        );
    }

    const option: EChartsOption = useMemo(() => ({
        grid: {
            left: '3%',
            right: '4%',
            bottom: '18%', // Increased bottom margin for dataZoom
            containLabel: true,
        },
        tooltip: {
            trigger: 'axis',
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
                const currentData = trendData[dataIndex];
                if (!currentData) return '';
    
                const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(param.value);
                
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
            axisLabel: { show: false }, // Labels are shown in dataZoom
            axisLine: { show: false },
            axisTick: { show: false },
            boundaryGap: false,
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: labelColor,
                fontSize: 12,
                formatter: (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 0 }).format(val)
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
                start: trendData.length > 12 ? Math.max(0, 100 - (12 / trendData.length * 100)) : 0,
                end: 100,
                bottom: 10,
                height: 25,
                dataBackground: {
                    lineStyle: { color: '#3B82F6', width: 1, opacity: 0.3 },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [{
                                offset: 0,
                                color: 'rgba(59, 130, 246, 0.2)'
                            }, {
                                offset: 1,
                                color: 'rgba(59, 130, 246, 0.05)'
                            }]
                        }
                    }
                },
                fillerColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(79, 70, 229, 0.2)',
                borderColor: 'transparent',
                handleStyle: { color: '#4F46E5' },
                moveHandleStyle: { color: '#4F46E5' },
                textStyle: { color: labelColor },
            }
        ],
        series: [{
            name: 'Revenue',
            type: 'line',
            smooth: 0.6,
            data: trendData.map(d => Math.round(d.value)),
            showSymbol: true,
            symbolSize: selectedPeriodKey ? 8 : 0,
            lineStyle: {
                width: 3,
                shadowColor: 'rgba(59, 130, 246, 0.3)',
                shadowBlur: 8,
                shadowOffsetY: 4,
            },
            areaStyle: {
                 color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [{
                        offset: 0, color: isDark ? 'rgba(96, 165, 250, 0.4)' : 'rgba(59, 130, 246, 0.4)'
                    }, {
                        offset: 1, color: isDark ? 'rgba(96, 165, 250, 0)' : 'rgba(59, 130, 246, 0)'
                    }]
                }
            },
            emphasis: {
                focus: 'series',
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 2,
                }
            },
        }],
        color: [isDark ? '#60A5FA' : '#3B82F6'],
    }), [trendData, isDark, labelColor, gridBorderColor, selectedPeriodKey]);
    
    const onEvents = {
        click: (params: any) => {
            if (params.dataIndex !== undefined && onPeriodSelect) {
                const dataPoint = trendData[params.dataIndex];
                onPeriodSelect(dataPoint.sortKey);
            }
        },
    };

    return (
        <div className="h-full w-full relative" aria-label={`Revenue trend by ${granularity}`} role="figure" tabIndex={0}>
            <ReactECharts
                ref={chartRef}
                option={option}
                style={{ height: '100%', width: '100%' }}
                onEvents={onEvents}
                notMerge={true}
                lazyUpdate={true}
            />
            <AnimatePresence>
                {(isLoadingAnalysis || analysis) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-secondary-bg/80 dark:bg-dark-secondary-bg/80 backdrop-blur-sm flex items-center justify-center p-4 rounded-lg"
                    >
                        {isLoadingAnalysis ? (
                            <div className="text-center">
                                <Spinner size="lg"/>
                                <p className="mt-4 font-semibold text-primary-text dark:text-dark-primary-text">Gemini is analyzing the trend...</p>
                            </div>
                        ) : (
                            <div className="relative w-full max-w-md text-center">
                                <button onClick={onClearAnalysis} className="absolute -top-2 -right-2 p-1 bg-secondary-bg dark:bg-dark-secondary-bg rounded-full shadow-md text-secondary-text dark:text-dark-secondary-text hover:text-primary-text dark:hover:text-dark-primary-text">
                                    <XMarkIcon className="h-5 w-5"/>
                                </button>
                                <h4 className="font-semibold text-lg text-primary-text dark:text-dark-primary-text flex items-center justify-center gap-2">
                                    <SparklesIcon className="h-5 w-5 text-highlight"/>
                                    AI Trend Analysis
                                </h4>
                                <p className="mt-2 text-base text-secondary-text dark:text-dark-secondary-text italic">"{analysis}"</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

RevenueTrendChart.displayName = 'RevenueTrendChart';

export default RevenueTrendChart;