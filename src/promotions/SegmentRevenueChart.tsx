import React, { useContext, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { DocumentMagnifyingGlassIcon } from '../ui/Icons';
import { ThemeContext } from '../../contexts/ThemeContext';

interface SegmentRevenueChartProps {
    segments: { name: string; revenue: number }[];
    onSegmentSelect: (segment: string | null) => void;
    selectedSegment: string | null;
}

const SegmentRevenueChart: React.FC<SegmentRevenueChartProps> = React.memo(({ segments, onSegmentSelect, selectedSegment }) => {
    const themeContext = useContext(ThemeContext);
    const isDark = themeContext?.theme === 'dark';

    const totalColor = isDark ? '#d4d4d8' : '#4B5563';
    const valueColor = isDark ? '#f9fafb' : '#1F2937';

    if (segments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-xs text-secondary-text">
                <DocumentMagnifyingGlassIcon className="h-8 w-8 mb-2" />
                No segment data
            </div>
        );
    }
    
    const totalRevenue = useMemo(() => segments.reduce((sum, s) => sum + s.revenue, 0), [segments]);
    const data = useMemo(() => segments.map(s => ({ value: s.revenue, name: s.name })), [segments]);

    const options: EChartsOption = useMemo(() => ({
        tooltip: {
            trigger: 'item',
            formatter: (params: any) => {
                const { name, value, percent } = params;
                const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
                return `<strong>${name}</strong><br/>${formattedValue} (${percent}%)`;
            },
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            textStyle: { color: isDark ? '#f9fafb' : '#18181b' },
        },
        legend: {
            show: false,
        },
        series: [
            {
                name: 'Revenue by Segment',
                type: 'pie',
                radius: ['75%', '90%'],
                avoidLabelOverlap: false,
                label: {
                    show: true,
                    position: 'center',
                    formatter: () => {
                        const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalRevenue);
                        return `{total|Total Revenue}\n{value|${formattedTotal}}`;
                    },
                    rich: {
                        total: { fontSize: 12, color: totalColor },
                        value: { fontSize: 20, fontWeight: 'bold', color: valueColor, padding: [5, 0] }
                    }
                },
                emphasis: {
                    label: {
                        show: true,
                        formatter: (params: any) => {
                             const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(params.value);
                            return `{name|${params.name}}\n{value|${formattedValue}}`;
                        },
                         rich: {
                            name: { fontSize: 16, color: totalColor },
                            value: { fontSize: 32, fontWeight: 'bold', color: valueColor, padding: [5, 0] }
                        }
                    }
                },
                labelLine: {
                    show: false
                },
                data: data.map(item => ({
                    ...item,
                    itemStyle: {
                        opacity: selectedSegment && selectedSegment !== item.name ? 0.4 : 1
                    }
                }))
            }
        ]
    }), [totalRevenue, data, isDark, totalColor, valueColor, selectedSegment]);
    
    const onEvents = {
        'click': (params: any) => {
            if (params.name) {
                onSegmentSelect(params.name);
            }
        },
    };

    return (
         <div aria-label="Revenue by segment pie chart" role="figure" tabIndex={0}>
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

SegmentRevenueChart.displayName = 'SegmentRevenueChart';

export default SegmentRevenueChart;