import React, { useMemo, useContext } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { DocumentMagnifyingGlassIcon } from '../../ui/Icons';
import type { Sale } from '../../../types';
import { ThemeContext } from '../../../contexts/ThemeContext';

const compactCurrencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);

interface SalesBySegmentChartProps {
  data: Sale[];
  onSegmentSelect: (segment: string | null) => void;
  selectedSegment: string | null;
  itemCount: number;
}

const PALETTE = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

const SalesBySegmentChart: React.FC<SalesBySegmentChartProps> = React.memo(({ data, onSegmentSelect, selectedSegment }) => {
    const themeContext = useContext(ThemeContext);
    const isDark = themeContext?.theme === 'dark';
    
    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const primaryTextColor = isDark ? '#f9fafb' : '#1F2937';

    const { segmentData, totalRevenue } = useMemo(() => {
        const aggregated = data.reduce((acc: Record<string, number>, sale) => {
            const segment = sale.segment || 'Unknown';
            if (segment === 'N/A') return acc;
            acc[segment] = (acc[segment] || 0) + sale.totalRevenue;
            return acc;
        }, {} as Record<string, number>);
        
        const total = Object.values(aggregated).reduce((sum, val) => sum + val, 0);

        return {
            totalRevenue: total,
            segmentData: Object.entries(aggregated)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value),
        };
    }, [data]);

    if (segmentData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-secondary-text p-4 text-center">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No segment data for this period.</p>
            </div>
        );
    }
    
    const option: EChartsOption = useMemo(() => {
        return {
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    const { name, value, percent } = params;
                    const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
                    return `<strong>${name}</strong><br/>${formattedValue} (${percent}%)`;
                },
                backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? '#3f3f46' : '#e4e4e7',
                textStyle: { color: isDark ? '#f9fafb' : '#18181b' }
            },
            legend: {
                orient: 'horizontal',
                left: 'center',
                bottom: 10,
                textStyle: { color: labelColor },
                icon: 'circle',
                selectedMode: 'multiple',
            },
            series: [
                {
                    name: 'Revenue by Segment',
                    type: 'pie',
                    radius: ['70%', '90%'],
                    center: ['50%', '45%'],
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderRadius: 8,
                        borderColor: isDark ? '#27272a' : '#FFFFFF',
                        borderWidth: 2,
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        scale: true,
                        scaleSize: 10,
                        label: {
                            show: true,
                            formatter: '{b}\n{d}%',
                            fontSize: 16,
                            fontWeight: 'bold',
                            color: primaryTextColor
                        },
                    },
                    labelLine: { show: false },
                    data: segmentData.map((item, index) => ({
                        value: item.value,
                        name: item.name,
                        itemStyle: {
                            color: PALETTE[index % PALETTE.length],
                            opacity: selectedSegment && selectedSegment !== item.name ? 0.4 : 1,
                        }
                    }))
                }
            ],
            title: {
                text: 'Total Revenue',
                subtext: compactCurrencyFormatter(totalRevenue),
                left: '49%',
                top: '42%',
                textAlign: 'center',
                textStyle: {
                    color: labelColor,
                    fontSize: 14,
                    fontWeight: 'normal',
                },
                subtextStyle: {
                    color: primaryTextColor,
                    fontSize: 24,
                    fontWeight: 'bold'
                }
            }
        };
    }, [segmentData, totalRevenue, isDark, labelColor, primaryTextColor, selectedSegment]);

    const onEvents = {
        'click': (params: any) => {
            if (params.name) {
                onSegmentSelect(selectedSegment === params.name ? null : params.name);
            }
        },
    };
    
    return (
        <div className="h-full w-full" aria-label="Revenue by customer segment pie chart" role="figure" tabIndex={0}>
            <ReactECharts
                option={option}
                style={{ height: '350px', width: '100%' }}
                onEvents={onEvents}
                notMerge={true}
                lazyUpdate={true}
            />
        </div>
    );
});

SalesBySegmentChart.displayName = 'SalesBySegmentChart';

export default SalesBySegmentChart;