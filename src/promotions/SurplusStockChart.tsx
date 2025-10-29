
import React, { useContext, useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { DocumentMagnifyingGlassIcon } from '../ui/Icons';
import { ThemeContext } from '../../contexts/ThemeContext';

interface SurplusItem {
    mtm: string;
    modelName: string;
    inStockQty: number;
    historicalSales: number;
}

interface SurplusStockChartProps {
    surplusItems: SurplusItem[];
}

const SurplusStockChart: React.FC<SurplusStockChartProps> = React.memo(({ surplusItems }) => {
    const themeContext = useContext(ThemeContext);
    const chartRef = useRef<ReactECharts>(null);
    const isDark = themeContext?.theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const dataLabelColor = isDark ? '#f9fafb' : '#1F2937';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';
    
    // Force resize on mount to fix rendering issues inside flex/grid containers
    useEffect(() => {
        const timer = setTimeout(() => {
            chartRef.current?.getEchartsInstance().resize();
        }, 150);
        return () => clearTimeout(timer);
    }, []);

    if (surplusItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-secondary-text text-sm p-4">
                <DocumentMagnifyingGlassIcon className="h-8 w-8 text-secondary-text mb-2"/>
                <p>No significant surplus inventory found.</p>
            </div>
        );
    }
    
    const sortedItems = useMemo(() => [...surplusItems].sort((a,b) => a.inStockQty - b.inStockQty), [surplusItems]);

    const options: EChartsOption = useMemo(() => ({
        grid: {
            left: '10px',
            right: '40px',
            top: '5px',
            bottom: '5px',
            containLabel: true,
        },
        xAxis: {
            type: 'value',
            show: true,
            axisLabel: { show: false },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { 
                show: true,
                lineStyle: {
                    color: gridBorderColor,
                    type: 'solid'
                }
            },
        },
        yAxis: {
            type: 'category',
            data: sortedItems.map(item => item.modelName),
            axisLabel: {
                show: true,
                color: labelColor,
                fontSize: 12,
                fontWeight: 500,
                formatter: (val: string) => val.length > 20 ? `${val.substring(0, 18)}...` : val,
            },
            axisLine: { show: false },
            axisTick: { show: false },
        },
        series: [{
            name: 'In Stock',
            type: 'bar',
            data: sortedItems.map(item => item.inStockQty),
            barWidth: '25%',
            itemStyle: {
                borderRadius: 4,
                color: {
                    type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
                    colorStops: isDark ? [{ offset: 0, color: "#059669" }, { offset: 1, color: "#34D399" }] : [{ offset: 0, color: "#10B981" }, { offset: 1, color: "#34D399" }]
                }
            },
            label: {
                show: true,
                position: 'right',
                formatter: (params: any) => params.value.toLocaleString(),
                distance: 10,
                color: dataLabelColor,
                fontSize: 12,
                fontWeight: 600,
            }
        }],
        tooltip: {
            trigger: 'item',
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            textStyle: { color: isDark ? '#f9fafb' : '#18181b' },
            formatter: (params: any) => {
                const item = sortedItems[params.dataIndex];
                if (!item) return '';
                return `
                    <div class="font-sans p-2">
                        <div class="font-bold text-base mb-1">${item.modelName}</div>
                        <div class="grid grid-cols-2 gap-x-4 text-sm">
                          <span>In Stock:</span><span class="font-semibold text-right">${item.inStockQty.toLocaleString()}</span>
                          <span>Last Year Sales:</span><span class="font-semibold text-right">${item.historicalSales.toLocaleString()}</span>
                        </div>
                    </div>
                `;
            }
        },
    }), [sortedItems, isDark, labelColor, dataLabelColor, gridBorderColor]);

    return (
        <div aria-label="Surplus stock chart" role="figure" tabIndex={0}>
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

SurplusStockChart.displayName = 'SurplusStockChart';

export default SurplusStockChart;
