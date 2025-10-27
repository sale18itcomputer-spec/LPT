import React, { useMemo, useContext } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { InventoryItem } from '../../types';
import { DocumentMagnifyingGlassIcon } from '../ui/Icons';
import { ThemeContext } from '../../contexts/ThemeContext';

interface InventoryStatusChartProps {
    data: InventoryItem[];
    onFilterChange: (status: string | null) => void;
    activeFilter: string | null;
}

const STATUS_COLORS: Record<string, string> = {
    healthy: '#16A34A',
    lowStock: '#F59E0B',
    critical: '#EF4444',
    outOfStock: '#9CA3AF',
    noSales: '#6B7280',
};
const MUTED_COLOR = '#D1D5DB';

const InventoryStatusChart: React.FC<InventoryStatusChartProps> = React.memo(({ data, onFilterChange, activeFilter }) => {
    const themeContext = useContext(ThemeContext);
    const isDark = themeContext?.theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#71717a';
    const primaryTextColor = isDark ? '#f9fafb' : '#18181b';

    const chartData = useMemo(() => {
        const statusCounts = {
            healthy: 0,
            lowStock: 0,
            critical: 0,
            outOfStock: 0,
            noSales: 0,
        };

        data.forEach(item => {
            if (item.onHandQty <= 0) {
                statusCounts.outOfStock++;
            } else if (item.weeksOfInventory === null) {
                statusCounts.noSales++;
            } else if (item.weeksOfInventory < 4) {
                statusCounts.critical++;
            } else if (item.weeksOfInventory <= 12) {
                statusCounts.lowStock++;
            } else {
                statusCounts.healthy++;
            }
        });
        
        return [
            { name: 'Healthy', value: statusCounts.healthy, filter: 'healthy' },
            { name: 'Low Stock', value: statusCounts.lowStock, filter: 'lowStock' },
            { name: 'Critical', value: statusCounts.critical, filter: 'critical' },
            { name: 'Out of Stock', value: statusCounts.outOfStock, filter: 'outOfStock' },
            { name: 'No Recent Sales', value: statusCounts.noSales, filter: 'noSales' },
        ].filter(d => d.value > 0);
    }, [data]);

    if (chartData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-secondary-text p-4 text-center">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No inventory data to display</p>
            </div>
        );
    }
    
    const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

    const options: EChartsOption = useMemo(() => ({
        tooltip: {
            trigger: 'item',
            formatter: (params: any) => `${params.name}: <strong>${params.value.toLocaleString()} SKUs</strong> (${params.percent}%)`,
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            textStyle: { color: isDark ? '#f9fafb' : '#18181b' }
        },
        legend: {
            position: 'bottom',
            textStyle: { color: labelColor, fontFamily: 'Inter, sans-serif', fontWeight: 500 },
            itemGap: 10,
            icon: 'circle',
        },
        series: [{
            type: 'pie',
            radius: ['70%', '90%'],
            avoidLabelOverlap: false,
            label: {
                show: true,
                position: 'center',
                formatter: () => `{total|Total SKUs}\n{value|${totalValue.toLocaleString()}}`,
                rich: {
                    total: { fontSize: 16, color: labelColor },
                    value: { fontSize: 32, fontWeight: 'bold', color: primaryTextColor, padding: [5, 0] }
                }
            },
            emphasis: {
                label: {
                    show: true,
                    formatter: (params: any) => `{name|${params.name}}\n{value|${Number(params.value).toLocaleString()}}`,
                    rich: {
                        name: { fontSize: 16, color: labelColor },
                        value: { fontSize: 32, fontWeight: 'bold', color: primaryTextColor, padding: [5, 0] }
                    }
                }
            },
            data: chartData.map(d => ({
                name: d.name,
                value: d.value,
                itemStyle: {
                    color: !activeFilter || activeFilter === d.filter ? STATUS_COLORS[d.filter] : (isDark ? '#404040' : MUTED_COLOR),
                    borderColor: isDark ? '#27272a' : '#FFFFFF',
                    borderWidth: 3
                }
            }))
        }]
    }), [chartData, activeFilter, isDark, labelColor, primaryTextColor, totalValue]);
    
    const onEvents = {
        'click': (params: any) => {
            const selectedFilter = chartData.find(d => d.name === params.name)?.filter;
            if (selectedFilter) {
                onFilterChange(activeFilter === selectedFilter ? null : selectedFilter);
            }
        }
    };

    return (
        <div className="h-full w-full" aria-label="Inventory health status pie chart" role="figure" tabIndex={0}>
            <ReactECharts
                option={options}
                style={{ height: '100%', width: '100%' }}
                onEvents={onEvents}
                notMerge={true}
                lazyUpdate={true}
            />
        </div>
    );
});

InventoryStatusChart.displayName = 'InventoryStatusChart';

export default InventoryStatusChart;