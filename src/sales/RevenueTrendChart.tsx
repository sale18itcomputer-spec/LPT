
import React, { useMemo, useContext, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentMagnifyingGlassIcon, SparklesIcon, XMarkIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '../ui/Icons';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import AnimatedCounter from '../ui/AnimatedCounter';

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

const SummaryStat: React.FC<{ label: string; value: number; formatter: (val: number) => string; trend?: number | null }> = ({ label, value, formatter, trend }) => {
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


const RevenueTrendChart: React.FC<RevenueTrendChartProps> = React.memo(({ trendData, granularity, analysis, isLoadingAnalysis, onClearAnalysis, onPeriodSelect, selectedStartDate }) => {
    const themeContext = useContext(ThemeContext);
    const chartRef = useRef<ReactECharts>(null);
    const isDark = themeContext?.theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';
    
    // Force resize on mount to fix rendering issues inside flex/grid containers
    useEffect(() => {
        const timer = setTimeout(() => {
            chartRef.current?.getEchartsInstance().resize();
        }, 150);
        return () => clearTimeout(timer);
    }, []);
    
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

    const { summaryStats } = useMemo(() => {
        if (trendData.length === 0) {
            return { summaryStats: { min: 0, max: 0, avg: 0, median: 0, growth: null } };
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
        
        return { summaryStats: stats };
    }, [trendData]);
    
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
            bottom: '5%',
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
            iconStyle: { borderColor: labelColor }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross', crossStyle: { color: isDark ? '#555' : '#999' } },
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            textStyle: { color: isDark ? '#f9fafb' : '#18181b', fontFamily: 'Inter, sans-serif' },
            formatter: (params: any) => {
                if (!params || params.length === 0) return '';
                const dataIndex = params[0].dataIndex;
                const currentData = trendData[dataIndex];
                if (!currentData) return '';
                
                const revenueParam = params.find((p: any) => p.seriesName === 'Revenue');
                
                let trendIndicator = '';
                if (dataIndex > 0) {
                    const prevValue = trendData[dataIndex - 1].value;
                    if (prevValue > 0) {
                        const change = ((currentData.value - prevValue) / prevValue) * 100;
                        trendIndicator = `<span style="color: ${change >= 0 ? '#10B981' : '#EF4444'}; font-weight: 600;">${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%</span>`;
                    }
                }

                return `
                    <div class="p-2 font-sans text-sm" style="min-width: 200px;">
                        <div class="font-bold mb-1">${currentData.label}</div>
                        <div class="grid grid-cols-[auto,1fr] gap-x-4">
                            <span>Revenue:</span><span class="font-semibold text-right">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(revenueParam?.value ?? 0)}</span>
                            <span>MoM Change:</span><span class="font-semibold text-right">${trendIndicator || 'N/A'}</span>
                        </div>
                    </div>
                `;
            }
        },
        xAxis: {
            type: 'category',
            data: trendData.map(d => d.label),
            axisLabel: { color: labelColor, fontSize: 12 },
            axisLine: { show: false },
            axisTick: { show: false },
            boundaryGap: false,
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: labelColor, fontSize: 12, formatter: (val: number) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(val) },
            splitLine: { show: true, lineStyle: { color: gridBorderColor, type: 'dashed' } },
            min: 0,
        },
        series: [{
            name: 'Revenue',
            type: 'line',
            smooth: true,
            data: trendData.map(d => Math.round(d.value)),
            showSymbol: false,
            color: isDark ? '#60a5fa' : '#3b82f6',
            emphasis: { focus: 'series', itemStyle: { borderWidth: 2, borderColor: '#fff', shadowBlur: 5, shadowColor: 'rgba(0,0,0,0.3)' } },
            lineStyle: { width: 3, shadowColor: 'rgba(0, 0, 0, 0.3)', shadowBlur: 10, shadowOffsetY: 8 },
            areaStyle: {
                color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: isDark ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.4)' }, { offset: 1, color: isDark ? 'rgba(59, 130, 246, 0)' : 'rgba(59, 130, 246, 0)' }] },
                shadowColor: 'rgba(0,0,0,0.1)', shadowBlur: 10
            },
            markLine: {
                silent: true,
                symbol: 'none',
                data: [{ yAxis: summaryStats.avg, name: 'Average', lineStyle: { type: 'dashed', color: isDark ? '#FBBF24' : '#F59E0B' }, label: { formatter: 'Avg: ${c}', position: 'insideEndTop', color: isDark ? '#FBBF24' : '#D97706' } }]
            },
        }],
    }), [trendData, isDark, labelColor, gridBorderColor, selectedPeriodKey, summaryStats]);
    
    const onEvents = {
        click: (params: any) => {
            if (params.dataIndex !== undefined && onPeriodSelect) {
                const dataPoint = trendData[params.dataIndex];
                onPeriodSelect(dataPoint.sortKey);
            }
        },
    };

    const currencyCompactFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);

    return (
        <div className="h-full w-full flex flex-col" aria-label={`Revenue trend by ${granularity}`} role="figure" tabIndex={0}>
             <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-4 pb-2 border-b border-border-color dark:border-dark-border-color mb-2">
                <SummaryStat label="Average" value={summaryStats.avg} formatter={currencyCompactFormatter} />
                <SummaryStat label="Median" value={summaryStats.median} formatter={currencyCompactFormatter} />
                <SummaryStat label="Highest" value={summaryStats.max} formatter={currencyCompactFormatter} />
                <SummaryStat label="Lowest" value={summaryStats.min} formatter={currencyCompactFormatter} />
                <SummaryStat label="Growth" value={0} formatter={(v) => ''} trend={summaryStats.growth}/>
            </div>
            <div className="relative flex-grow min-h-0">
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
        </div>
    );
});

RevenueTrendChart.displayName = 'RevenueTrendChart';

export default RevenueTrendChart;