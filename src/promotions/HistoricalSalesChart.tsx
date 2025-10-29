
import React, { useContext, useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { ThemeContext } from '../../contexts/ThemeContext';

interface HistoricalSalesChartProps {
    dailySales: { date: string; revenue: number }[];
}

const HistoricalSalesChart: React.FC<HistoricalSalesChartProps> = React.memo(({ dailySales }) => {
    const themeContext = useContext(ThemeContext);
    const chartRef = useRef<ReactECharts>(null);
    const isDark = themeContext?.theme === 'dark';
    
    // Force resize on mount to fix rendering issues inside flex/grid containers
    useEffect(() => {
        const timer = setTimeout(() => {
            chartRef.current?.getEchartsInstance().resize();
        }, 150);
        return () => clearTimeout(timer);
    }, []);

    const options: EChartsOption = useMemo(() => ({
        grid: {
            left: 0,
            right: 0,
            top: 5,
            bottom: 5,
        },
        xAxis: {
            type: 'category',
            data: dailySales.map(d => d.date),
            show: false,
        },
        yAxis: {
            type: 'value',
            show: false,
        },
        series: [{
            name: 'Revenue',
            type: 'bar',
            data: dailySales.map(d => d.revenue),
            itemStyle: {
                borderRadius: [2, 2, 0, 0],
            },
            barWidth: '80%',
        }],
        color: [isDark ? '#818CF8' : '#A5B4FC'],
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            textStyle: {
                color: isDark ? '#f9fafb' : '#18181b',
                fontFamily: 'Inter, sans-serif'
            },
            formatter: (params: any) => {
                if (!params || params.length === 0) return '';
                const dataIndex = params[0].dataIndex;
                const saleData = dailySales[dataIndex];
                if (!saleData) return '';
                
                const date = new Date(saleData.date);
                const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                const revenueString = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(saleData.revenue);
                
                return `<div class="p-1"><strong>${dateString}:</strong> ${revenueString}</div>`;
            }
        },
    }), [dailySales, isDark]);

    return (
        <div aria-label="Historical daily sales chart" role="figure" tabIndex={0}>
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

HistoricalSalesChart.displayName = 'HistoricalSalesChart';

export default HistoricalSalesChart;
