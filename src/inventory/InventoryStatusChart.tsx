import React, { useMemo, useContext, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { InventoryItem } from '../../types';
import { DocumentMagnifyingGlassIcon } from '../ui/Icons';
import { ThemeContext } from '../../contexts/ThemeContext';

interface InventoryStatusChartProps {
    data: InventoryItem[];
    onFilterChange: (status: string | null) => void;
    activeFilter: string | null;
}

// Map filter keys to colors
const STATUS_COLORS: Record<string, string> = {
    healthy: '#16A34A',
    lowStock: '#F59E0B',
    outOfStock: '#EF4444',
    noSales: '#6B7280',
};
const MUTED_COLOR = '#D1D5DB';

const InventoryStatusChart: React.FC<InventoryStatusChartProps> = ({ data, onFilterChange, activeFilter }) => {
    const themeContext = useContext(ThemeContext);
    const isDark = themeContext?.theme === 'dark';

    const chartData = useMemo(() => {
        const statusCounts = {
            healthy: 0,
            lowStock: 0,
            outOfStock: 0,
            noSales: 0,
        };

        data.forEach(item => {
            if (item.onHandQty <= 0) {
                statusCounts.outOfStock++;
            } else if (item.weeksOfInventory === null) {
                statusCounts.noSales++;
            } else if (item.weeksOfInventory <= 12) {
                statusCounts.lowStock++;
            } else {
                statusCounts.healthy++;
            }
        });
        
        return [
            { name: 'Healthy', value: statusCounts.healthy, filter: 'healthy' },
            { name: 'Low Stock', value: statusCounts.lowStock, filter: 'lowStock' },
            { name: 'Out of Stock', value: statusCounts.outOfStock, filter: 'outOfStock' },
            { name: 'No Recent Sales', value: statusCounts.noSales, filter: 'noSales' },
        ].filter(d => d.value > 0);
    }, [data]);

    const chartColors = useMemo(() => {
        if (!activeFilter) {
            return chartData.map(d => STATUS_COLORS[d.filter]);
        }
        return chartData.map(d => d.filter === activeFilter ? STATUS_COLORS[d.filter] : MUTED_COLOR);
    }, [activeFilter, chartData]);

    if (chartData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-secondary-text">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No inventory data to display</p>
            </div>
        );
    }
    
    const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

    const series = chartData.map(d => d.value);

    const options: ApexOptions = useMemo(() => ({
        chart: {
            type: 'donut',
            height: '100%',
            fontFamily: 'Inter, sans-serif',
            toolbar: { show: false },
            events: {
                dataPointSelection: (event, chartContext, config) => {
                    const selectedFilter = chartData[config.dataPointIndex]?.filter;
                    if (selectedFilter) {
                        onFilterChange(activeFilter === selectedFilter ? null : selectedFilter);
                    }
                },
            },
        },
        series,
        labels: chartData.map(d => d.name),
        colors: chartColors,
        plotOptions: {
            pie: {
                expandOnClick: false,
                stroke: {
                    width: 3,
                    colors: [isDark ? '#18181b' : '#FFFFFF'], // primary-bg color
                },
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        // Configuration for the label of the hovered slice
                        name: {
                            show: true,
                            offsetY: -10,
                            fontSize: '1rem',
                            color: '#71717a', // zinc-500
                        },
                        // Configuration for the value of the hovered slice
                        value: {
                            show: true,
                            offsetY: 10,
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: isDark ? '#f9fafb' : '#18181b',
                            formatter: (val) => Number(val).toLocaleString(),
                        },
                        // Configuration for the label in the center when not hovered
                        total: {
                            show: true,
                            showAlways: true, // This is important
                            label: 'Total SKUs',
                            fontSize: '1rem',
                            color: '#71717a',
                            formatter: () => totalValue.toLocaleString(),
                        },
                    },
                },
            },
        },
        dataLabels: {
            enabled: false,
        },
        legend: {
            position: 'bottom',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            itemMargin: { horizontal: 5, vertical: 5 },
            labels: { colors: isDark ? '#d4d4d8' : '#4B5563' }
        },
        tooltip: {
            y: {
                formatter: (val) => `${val.toLocaleString()} SKUs`
            }
        },
        states: {
            hover: {
                filter: { type: 'lighten', value: 0.05 } as any,
            },
            active: {
                filter: { type: 'none' },
                allowMultipleDataPointsSelection: false,
            }
        },
    }), [chartData, activeFilter, onFilterChange, isDark, chartColors, totalValue]);

    return (
        <ReactApexChart
            options={options}
            series={series}
            type="donut"
            height="100%"
            width="100%"
        />
    );
};

export default InventoryStatusChart;