import React, { useMemo, useContext } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import Card from '../../ui/Card';
import { DocumentMagnifyingGlassIcon } from '../../ui/Icons';
import { ThemeContext } from '../../../contexts/ThemeContext';
import type { Order, Sale } from '../../../types';

interface ChartProps {
    orders: Order[];
    sales: Sale[];
}

const ReconciliationStatusChart: React.FC<ChartProps> = ({ orders, sales }) => {
    const themeContext = useContext(ThemeContext);
    const { theme } = themeContext!;
    const isDark = theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const primaryTextColor = isDark ? '#f9fafb' : '#1F2937';

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
            } else { // Matched or the "impossible" oversold
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
    const series = chartData.map(d => d.value);
    const labels = chartData.map(d => d.name);

    const options: ApexOptions = {
        chart: { type: 'donut', height: '100%', fontFamily: 'Inter, sans-serif' },
        series, labels,
        colors: ['#10B981', '#F97316'],
        plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'Total Orders', fontSize: '0.875rem', color: labelColor, formatter: () => totalValue.toLocaleString() }, value: { show: true, fontSize: '1.75rem', fontWeight: 'bold', color: primaryTextColor } } } } },
        dataLabels: { enabled: false },
        legend: { position: 'bottom', fontFamily: 'Inter, sans-serif', fontWeight: 500, itemMargin: { horizontal: 5, vertical: 5 }, labels: { colors: labelColor } },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            custom: function({ seriesIndex, w }) {
                const status = w.globals.labels[seriesIndex];
                const value = w.globals.series[seriesIndex];
                let explanation = '';
                switch(status) {
                    case 'Matched':
                        explanation = 'Total units sold match total units ordered for these Sales Orders.';
                        break;
                    case 'Unsold':
                        explanation = 'Fewer units sold than ordered. Order may be partially fulfilled or sales data is pending.';
                        break;
                }
                return `
                  <div class="p-2 rounded-lg bg-secondary-bg dark:bg-dark-secondary-bg text-primary-text dark:text-dark-primary-text font-sans text-sm border border-border-color dark:border-dark-border-color shadow-lg" style="max-width: 200px;">
                    <div class="font-bold mb-1">${status}: ${value.toLocaleString()} SOs</div>
                    <p class="text-xs text-secondary-text dark:text-dark-secondary-text whitespace-normal">${explanation}</p>
                  </div>
                `;
            }
        },
    };

    return (
        <div className="h-full">
            <ReactApexChart options={options} series={series} type="donut" height="100%" />
        </div>
    );
};

export default ReconciliationStatusChart;