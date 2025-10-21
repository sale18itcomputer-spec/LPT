import React, { useMemo, useContext } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import Card from '../ui/Card';
import { DocumentMagnifyingGlassIcon } from '../ui/Icons';
import { ThemeContext } from '../../contexts/ThemeContext';
import type { Order, Sale } from '../../types';

interface ChartProps {
    orders: Order[];
    sales: Sale[];
    allOrders: Order[]; // For MTM -> Product Line mapping
}

const OrderVsSaleComparisonChart: React.FC<ChartProps> = ({ orders, sales, allOrders }) => {
    const themeContext = useContext(ThemeContext);
    const { theme } = themeContext!;
    const isDark = theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';

    const chartData = useMemo(() => {
        const mtmToProductLineMap = new Map<string, string>();
        allOrders.forEach(order => {
            if (!mtmToProductLineMap.has(order.mtm)) {
                mtmToProductLineMap.set(order.mtm, order.productLine);
            }
        });

        const ordersByPL = orders.reduce((acc, order) => {
            const pl = order.productLine;
            acc[pl] = (acc[pl] || 0) + order.qty;
            return acc;
        }, {} as Record<string, number>);

        const salesByPL = sales.reduce((acc, sale) => {
            const pl = mtmToProductLineMap.get(sale.lenovoProductNumber) || 'Unknown';
            acc[pl] = (acc[pl] || 0) + sale.quantity;
            return acc;
        }, {} as Record<string, number>);

        const allProductLines = [...new Set([...Object.keys(ordersByPL), ...Object.keys(salesByPL)])]
            .filter(pl => pl !== 'Unknown' && pl !== 'N/A')
            .sort();

        return {
            categories: allProductLines,
            series: [
                {
                    name: 'Matched Order Units',
                    data: allProductLines.map(pl => ordersByPL[pl] || 0),
                },
                {
                    name: 'Matched Sale Units',
                    data: allProductLines.map(pl => salesByPL[pl] || 0),
                },
            ],
        };
    }, [orders, sales, allOrders]);

    if (chartData.categories.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">Not enough data to generate a comparison chart.</p>
            </div>
        );
    }

    const isDense = chartData.categories.length > 8;

    const options: ApexOptions = {
        chart: {
            type: 'bar',
            height: '100%',
            fontFamily: 'Inter, sans-serif',
            toolbar: { show: false },
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '60%',
                borderRadius: 4,
            },
        },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: {
            categories: chartData.categories,
            labels: {
                style: { colors: labelColor, fontSize: '12px' },
                rotate: isDense ? -45 : 0,
                rotateAlways: isDense,
                hideOverlappingLabels: true,
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            title: { text: 'Total Units', style: { color: labelColor, fontWeight: 500 } },
            labels: { style: { colors: labelColor } },
        },
        fill: { opacity: 1 },
        legend: {
            position: 'top',
            horizontalAlign: 'left',
            labels: { colors: labelColor },
        },
        colors: ['#3B82F6', '#10B981'],
        grid: {
            borderColor: gridBorderColor,
            strokeDashArray: 4,
            yaxis: { lines: { show: true } },
            xaxis: { lines: { show: false } },
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            shared: true,
            intersect: false,
            custom: function({ series, dataPointIndex, w }) {
                const category = w.globals.labels[dataPointIndex];
                const orderUnits = series[0][dataPointIndex];
                const saleUnits = series[1][dataPointIndex];
                const variance = orderUnits - saleUnits;
                
                const varianceColor = variance === 0 ? 'text-secondary-text dark:text-dark-secondary-text' : variance > 0 ? 'text-orange-500' : 'text-red-500';
                const varianceText = variance === 0 ? 'Matched' : (variance > 0 ? `Undersold by ${variance}` : `Oversold by ${-variance}`);
    
                return `
                    <div class="p-2 rounded-lg bg-secondary-bg dark:bg-dark-secondary-bg text-primary-text dark:text-dark-primary-text font-sans text-sm border border-border-color dark:border-dark-border-color shadow-lg">
                      <div class="font-bold mb-1">${category}</div>
                      <div class="grid grid-cols-[auto,1fr] gap-x-4">
                          <span>Ordered Units:</span><span class="font-semibold text-right">${orderUnits.toLocaleString()}</span>
                          <span>Sold Units:</span><span class="font-semibold text-right">${saleUnits.toLocaleString()}</span>
                          <div class="col-span-2 my-1 border-t border-border-color dark:border-dark-border-color"></div>
                          <span>Variance:</span><span class="font-semibold text-right ${varianceColor}">${varianceText}</span>
                      </div>
                    </div>
                `;
            }
        },
    };

    return (
        <div className="w-full h-full">
            <ReactApexChart options={options} series={chartData.series} type="bar" height="100%" />
        </div>
    );
};

export default OrderVsSaleComparisonChart;