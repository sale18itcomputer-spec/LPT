import React, { useMemo, useContext } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { DocumentMagnifyingGlassIcon } from './ui/Icons';
import type { Order } from '../types';
import { ThemeContext } from '../contexts/ThemeContext';

const PRODUCT_LINE_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#1E3A8A'];
const MUTED_COLOR = '#D1D5DB';

interface ProductLineValueChartProps {
  orders: Order[];
  inModal?: boolean;
}

const ProductLineValueChart: React.FC<ProductLineValueChartProps> = ({ orders, inModal = false }) => {
    const themeContext = useContext(ThemeContext);
    const { theme } = themeContext!;
    const isDark = theme === 'dark';

    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const primaryTextColor = isDark ? '#f9fafb' : '#1F2937';

    const { productLineData, totalValue } = useMemo(() => {
        const aggregated = orders.reduce((acc: Record<string, { value: number; units: number }>, order) => {
            const productLine = order.productLine || 'Unknown';
            if (productLine === 'N/A') return acc;
            if (!acc[productLine]) {
                acc[productLine] = { value: 0, units: 0 };
            }
            acc[productLine].value += order.orderValue;
            acc[productLine].units += order.qty;
            return acc;
        }, {});
        
        const totalValue = orders.reduce((sum, order) => sum + order.orderValue, 0);

        const productLineData = Object.entries(aggregated)
            .map(([name, data]: [string, { value: number, units: number }]) => ({ name, value: data.value, units: data.units }))
            .sort((a,b) => b.value - a.value);

        return { productLineData, totalValue };
    }, [orders]);

    const chartColors = useMemo(() => {
        return productLineData.map((_, index) => PRODUCT_LINE_COLORS[index % PRODUCT_LINE_COLORS.length]);
    }, [productLineData]);

    if (productLineData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-secondary-text">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No product line data</p>
            </div>
        );
    }

    const series = productLineData.map(d => d.value);

    const options: ApexOptions = {
        chart: {
            type: 'donut',
            height: '100%',
            fontFamily: 'Inter, sans-serif',
            toolbar: { show: false },
        },
        labels: productLineData.map(d => d.name),
        colors: chartColors,
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total Value',
                            fontSize: '0.875rem',
                            color: labelColor,
                            formatter: () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalValue)
                        },
                        value: {
                            show: true,
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            color: primaryTextColor,
                            formatter: (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(val))
                        }
                    }
                }
            }
        },
        dataLabels: { enabled: false },
        legend: {
            position: 'bottom',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            itemMargin: { horizontal: 5, vertical: 5 },
            labels: {
                colors: labelColor,
            }
        },
        tooltip: {
            y: {
                formatter: (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val),
            },
            custom: function({ series, seriesIndex, w }) {
                const item = productLineData[seriesIndex];
                if (!item) return '';
                const percentage = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0;
                return `
                  <div class="p-2 rounded-lg bg-secondary-bg dark:bg-dark-secondary-bg text-primary-text dark:text-dark-primary-text font-sans border border-border-color dark:border-dark-border-color shadow-lg">
                      <div class="font-bold text-base mb-1">${item.name} (${percentage}%)</div>
                      <div class="grid grid-cols-2 gap-x-4 text-sm">
                          <span>Value:</span>
                          <span class="font-semibold text-right">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.value)}</span>
                          <span>Units:</span>
                          <span class="font-semibold text-right">${item.units.toLocaleString()}</span>
                      </div>
                  </div>
                `;
            }
        },
        states: {
            hover: {
                filter: { type: 'lighten', value: 0.05 } as any,
            },
            active: {
                filter: { type: 'none' },
            }
        },
    };

    return (
        <div className="w-full h-full">
            <ReactApexChart
                options={options}
                series={series}
                type="donut"
                height="100%"
                width="100%"
            />
        </div>
    );
};

export default ProductLineValueChart;