import React, { useMemo, useContext } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { DocumentMagnifyingGlassIcon } from './ui/Icons';
import { ThemeContext } from '../contexts/ThemeContext';

interface StatusData {
  name: string;
  value: number;
}

const STATUS_COLORS: Record<string, string> = {
    'Arrived': '#16A34A',
    'Delivered': '#10B981',
    'In Transit Hub (SGP)': '#3B82F6',
    'Pending': '#F59E0B',
    'Shipped': '#60A5FA',
    'Released to Manufacturing': '#F97316',
};

interface StatusOverviewChartProps {
  data: StatusData[];
  inModal?: boolean;
}

const StatusOverviewChart: React.FC<StatusOverviewChartProps> = React.memo(({ data, inModal = false }) => {
    const themeContext = useContext(ThemeContext);
    const isDark = themeContext?.theme === 'dark';

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-secondary-text p-4 text-center">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No data to display</p>
            </div>
        );
    }

    const totalValue = data.reduce((sum, item) => sum + item.value, 0);

    const echartsData = useMemo(() => {
        return data.map(d => ({
            name: d.name,
            value: d.value,
            itemStyle: {
                color: STATUS_COLORS[d.name] || '#64748B'
            }
        }));
    }, [data]);

    const options: EChartsOption = useMemo(() => ({
        tooltip: {
            formatter: (params: any) => {
                const item = params.data;
                const percentage = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0;
                return `
                  <div class="p-2 rounded-lg font-sans text-sm">
                      <div class="font-bold text-base">${item.name}</div>
                      <div><strong>Value:</strong> ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.value)}</div>
                      <div class="mt-1 border-t border-border-color dark:border-dark-border-color pt-1"><strong>${percentage}%</strong> of total value</div>
                  </div>
                `;
            },
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            textStyle: { color: isDark ? '#f9fafb' : '#18181b' }
        },
        series: [{
            type: 'treemap',
            data: echartsData,
            label: {
                show: true,
                fontSize: 14,
                fontWeight: 'bold',
                fontFamily: 'Inter, sans-serif',
                formatter: (params: any) => {
                    if (params.treePathInfo.length > 1) return ''; // Only show top level labels
                    const value = params.value;
                    const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(value);
                    return `${params.name}\n${formattedValue}`;
                },
                color: '#fff',
                textShadowBlur: 2,
                textShadowColor: 'rgba(0, 0, 0, 0.3)',
            },
            upperLabel: { show: false },
            itemStyle: {
                gapWidth: 2,
                borderColor: isDark ? '#27272a' : '#FFFFFF',
            },
            breadcrumb: {
                show: false
            }
        }]
    }), [echartsData, totalValue, isDark]);

    return (
        <div className="w-full h-full" aria-label="Order status overview treemap" role="figure" tabIndex={0}>
            <ReactECharts
                option={options}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
            />
        </div>
    );
});

StatusOverviewChart.displayName = 'StatusOverviewChart';

export default StatusOverviewChart;