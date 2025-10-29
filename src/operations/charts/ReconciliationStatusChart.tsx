
import React, { useMemo, useContext, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { DocumentMagnifyingGlassIcon } from '../../ui/Icons';
import { ThemeContext } from '../../../contexts/ThemeContext';
import type { Order, Sale } from '../../../types';

interface ChartProps {
    orders: Order[];
    sales: Sale[];
    onSelect: (status: 'Matched' | 'Unsold' | null) => void;
    selected: 'Matched' | 'Unsold' | null;
}

const ReconciliationStatusChart: React.FC<ChartProps> = React.memo(({ orders, sales, onSelect, selected }) => {
    const chartRef = useRef<ReactECharts>(null);
    const themeContext = useContext(ThemeContext);
    const isDark = themeContext?.theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const primaryTextColor = isDark ? '#f9fafb' : '#1F2937';

    useEffect(() => {
        const timer = setTimeout(() => {
            chartRef.current?.getEchartsInstance().resize();
        }, 150);
        return () => clearTimeout(timer);
    }, []);

    const chartData = useMemo(() => {
        const orderQtyBySo = new Map<string, number>();
        orders.forEach(order => {
            orderQtyBySo.set(order.salesOrder, (orderQtyBySo.get(order.salesOrder) || 0) + order.qty);
        });

        const saleQtyBySo = new Map<string, number>();
        (sales as (Sale & { salesOrder: string })[]).forEach(sale => {
            if (sale.salesOrder) {
                saleQtyBySo.set(sale.salesOrder, (saleQtyBySo.get(sale.salesOrder) || 0) + sale.quantity);
            }
        });
        
        const statusCounts = {
            matched: 0,
            unsold: 0,
        };

        orderQtyBySo.forEach((orderQty, so) => {
            const saleQty = saleQtyBySo.get(so) || 0;
            if (orderQty > saleQty) {
                statusCounts.unsold++;
            } else {
                statusCounts.matched++;
            }
        });
        
        return [
            { name: 'Matched', value: statusCounts.matched },
            { name: 'Unsold', value: statusCounts.unsold },
        ].filter(d => d.value > 0);
    }, [orders, sales]);

    if (chartData.length === 0) {
        return <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center"><DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" /><p className="text-sm">No data for status breakdown.</p></div>;
    }
    
    const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

    const options: EChartsOption = useMemo(() => ({
        tooltip: {
            trigger: 'item',
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            textStyle: { color: isDark ? '#f9fafb' : '#18181b' },
            formatter: (params: any) => {
                const { name, value, percent } = params;
                let explanation = '';
                switch(name) {
                    case 'Matched':
                        explanation = 'Total units sold match or exceed total units ordered for these Sales Orders.';
                        break;
                    case 'Unsold':
                        explanation = 'Fewer units sold than ordered. Order may be partially fulfilled or sales data is pending.';
                        break;
                }
                return `
                  <div class="p-2 font-sans text-sm" style="max-width: 200px;">
                    <div class="font-bold mb-1">${name}: ${value.toLocaleString()} SOs (${percent}%)</div>
                    <p class="text-xs text-secondary-text dark:text-dark-secondary-text whitespace-normal">${explanation}</p>
                  </div>
                `;
            }
        },
        legend: {
            bottom: 'bottom',
            textStyle: {
                color: labelColor,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
            },
            itemGap: 10,
            icon: 'circle',
        },
        series: [{
            name: 'Reconciliation Status',
            type: 'pie',
            radius: ['70%', '90%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 8,
              borderColor: isDark ? '#18181b' : '#F9FAFB',
              borderWidth: 4,
            },
            label: {
                show: true,
                position: 'center',
                formatter: () => `{total|Total Orders}\n{value|${totalValue.toLocaleString()}}`,
                rich: {
                    total: { fontSize: 12, color: labelColor },
                    value: { fontSize: 20, fontWeight: 'bold', color: primaryTextColor, padding: [5, 0] },
                },
            },
            emphasis: {
                label: {
                    show: true,
                    formatter: (params: any) => `{name|${params.name}}\n{value|${Number(params.value).toLocaleString()}}`,
                    rich: {
                        name: { fontSize: 14, color: labelColor },
                        value: { fontSize: 24, fontWeight: 'bold', color: primaryTextColor, padding: [5, 0] }
                    }
                }
            },
            data: chartData.map(d => ({
                ...d,
                itemStyle: {
                    opacity: selected && selected !== d.name ? 0.3 : 1
                }
            })),
        }]
    }), [chartData, totalValue, isDark, labelColor, primaryTextColor, selected]);
    
    const onEvents = {
        'click': (params: any) => {
            if (params.name) {
                onSelect(selected === params.name ? null : (params.name as 'Matched' | 'Unsold'));
            }
        },
    };

    return (
        <div className="h-full" aria-label="Order reconciliation status pie chart" role="figure" tabIndex={0}>
            <ReactECharts
                ref={chartRef}
                option={options}
                style={{ height: '100%', width: '100%' }}
                onEvents={onEvents}
                notMerge={true}
                lazyUpdate={true}
            />
        </div>
    );
});

ReconciliationStatusChart.displayName = 'ReconciliationStatusChart';

export default ReconciliationStatusChart;
