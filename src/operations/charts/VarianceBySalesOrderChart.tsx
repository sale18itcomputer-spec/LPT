
import React, { useMemo, useContext, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { DocumentMagnifyingGlassIcon } from '../../ui/Icons';
import { ThemeContext } from '../../../contexts/ThemeContext';
import type { Order, Sale } from '../../../types';

interface ChartProps {
    orders: Order[];
    sales: Sale[];
    onSelect: (so: string | null) => void;
    selected: string | null;
}

const VarianceBySalesOrderChart: React.FC<ChartProps> = React.memo(({ orders, sales, onSelect, selected }) => {
    const chartRef = useRef<ReactECharts>(null);
    const themeContext = useContext(ThemeContext);
    const isDark = themeContext?.theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const dataLabelColor = isDark ? '#f9fafb' : '#1F2937';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';

    useEffect(() => {
        const timer = setTimeout(() => {
            chartRef.current?.getEchartsInstance().resize();
        }, 150);
        return () => clearTimeout(timer);
    }, []);

    const chartData = useMemo(() => {
        const varianceBySo = new Map<string, { orderQty: number, saleQty: number }>();

        orders.forEach(order => {
            const so = order.salesOrder;
            if (!varianceBySo.has(so)) varianceBySo.set(so, { orderQty: 0, saleQty: 0 });
            varianceBySo.get(so)!.orderQty += order.qty;
        });

        (sales as (Sale & { salesOrder: string })[]).forEach(sale => {
            if (sale.salesOrder) {
                const so = sale.salesOrder;
                if (!varianceBySo.has(so)) varianceBySo.set(so, { orderQty: 0, saleQty: 0 });
                varianceBySo.get(so)!.saleQty += sale.quantity;
            }
        });

        const sorted = Array.from(varianceBySo.entries())
            .map(([so, data]) => ({ 
                so, 
                ...data, 
                variance: data.orderQty - data.saleQty 
            }))
            .filter(({ variance }) => variance !== 0)
            .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
            .slice(0, 10)
            .sort((a,b) => b.variance - a.variance);

        return {
            categories: sorted.map(d => d.so),
            data: sorted,
        };
    }, [orders, sales]);

    if (chartData.categories.length === 0) {
        return <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center"><DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" /><p className="text-sm">No sales orders with unit variances found.</p></div>;
    }
    
    const options: EChartsOption = useMemo(() => ({
        grid: {
            left: '3%',
            right: '10%',
            top: '3%',
            bottom: '3%',
            containLabel: true
        },
        tooltip: {
            trigger: 'item',
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            textStyle: { color: isDark ? '#f9fafb' : '#18181b' },
            formatter: (params: any) => {
                const item = chartData.data.find(d => d.so === params.name);
                if (!item) return '';
    
                const varianceText = item.variance > 0 ? `+${item.variance} (Unsold)` : `${item.variance} (Oversold)`;
                const varianceColor = item.variance > 0 ? 'text-orange-500' : 'text-red-500';
    
                return `
                    <div class="p-2 font-sans text-sm">
                      <div class="font-bold mb-1">${item.so}</div>
                      <div class="grid grid-cols-[auto,1fr] gap-x-4">
                          <span>Ordered Qty:</span><span class="font-semibold text-right">${item.orderQty.toLocaleString()}</span>
                          <span>Sold Qty:</span><span class="font-semibold text-right">${item.saleQty.toLocaleString()}</span>
                          <div class="col-span-2 my-1 border-t border-border-color dark:border-dark-border-color"></div>
                          <span>Variance:</span><span class="font-semibold text-right ${varianceColor}">${varianceText}</span>
                      </div>
                    </div>
                `;
            }
        },
        xAxis: {
            type: 'value',
            axisLabel: { show: false },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: true, lineStyle: { color: gridBorderColor, type: 'dashed' } },
        },
        yAxis: {
            type: 'category',
            data: chartData.categories,
            axisLabel: { color: labelColor, fontSize: 12 },
            axisLine: { show: false },
            axisTick: { show: false },
        },
        series: [{
            name: 'Unit Variance',
            type: 'bar',
            barWidth: '25%',
            label: {
                show: true,
                position: 'right',
                formatter: (params: any) => Number(params.value) > 0 ? `+${params.value}` : String(params.value),
                color: dataLabelColor,
                fontWeight: 'bold',
                distance: 10,
            },
            data: chartData.data.map(item => ({
                value: item.variance,
                name: item.so,
                itemStyle: {
                    color: item.variance > 0 ? (isDark ? '#F97316' : '#FB923C') : (isDark ? '#DC2626' : '#EF4444'),
                    borderRadius: 4,
                    opacity: selected && selected !== item.so ? 0.3 : 1,
                }
            }))
        }]
    }), [chartData, isDark, labelColor, dataLabelColor, gridBorderColor, selected]);

    const onEvents = {
        'click': (params: any) => {
            if (params.name) {
                onSelect(selected === params.name ? null : params.name);
            }
        },
    };

    return (
        <div className="h-full" aria-label="Top 10 sales orders by unit variance" role="figure" tabIndex={0}>
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

VarianceBySalesOrderChart.displayName = 'VarianceBySalesOrderChart';

export default VarianceBySalesOrderChart;
