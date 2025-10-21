

import React, { useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { Order, Sale } from '../types';
import { DocumentMagnifyingGlassIcon, ChevronLeftIcon } from './ui/Icons';
import Card from './ui/Card';
import SegmentedControl from './ui/SegmentedControl';

interface ProductHierarchyChartProps {
  orders: Order[];
  sales: Sale[];
  inModal?: boolean;
}

// Professional color palettes for different drill-down levels
const HIERARCHY_PALETTES = [
    ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'], // Blues for Product Lines
    ['#065f46', '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'], // Emeralds for Segments
    ['#4a044e', '#7e22ce', '#9333ea', '#a855f7', '#c084fc', '#d8b4fe'], // Purples for MTMs
];

const ProductHierarchyChart: React.FC<ProductHierarchyChartProps> = ({ orders, sales, inModal = false }) => {
    const metric: 'revenue' | 'orderValue' = 'revenue';

    const { series, chartColors, title, breadcrumbs, metricLabel, fullSeriesData } = useMemo(() => {
        let currentTitle = `Revenue by Product & Segment`;
        let currentBreadcrumbs = "All Product Lines";
        let seriesData: { x: string; y: number; units: number }[] = [];
        
        // FIX: Explicitly type the accumulator in the reduce function to ensure correct type inference.
        const revenueByPL = sales.reduce((acc: Record<string, { revenue: number, units: number }>, sale) => {
            if (sale.productLine && sale.productLine !== 'N/A') {
                if (!acc[sale.productLine]) acc[sale.productLine] = { revenue: 0, units: 0 };
                acc[sale.productLine].revenue += sale.totalRevenue;
                acc[sale.productLine].units += sale.quantity;
            }
            return acc;
        }, {} as Record<string, { revenue: number, units: number }>);

        seriesData = Object.entries(revenueByPL)
            .map(([name, data]) => ({ x: name, y: Math.round(data.revenue), units: data.units }))
            .sort((a, b) => b.y - a.y);
        
        const palette = HIERARCHY_PALETTES[0];

        return {
            series: [{ data: seriesData }],
            chartColors: seriesData.map((_, index) => palette[index % palette.length]),
            title: currentTitle,
            breadcrumbs: currentBreadcrumbs,
            metricLabel: 'Revenue',
            fullSeriesData: seriesData,
        };
    }, [sales, orders, metric]);
    
    const options: ApexOptions = {
        chart: {
            type: 'treemap',
            height: '100%',
            fontFamily: 'Inter, sans-serif',
            toolbar: { show: false },
            animations: {
                enabled: true,
                speed: 400,
            },
        },
        colors: chartColors,
        plotOptions: {
            treemap: {
                distributed: true,
                enableShades: false,
            }
        },
        legend: { show: false },
        dataLabels: {
            enabled: true,
            style: {
              fontSize: '0.75rem',
              fontWeight: 'bold',
              fontFamily: 'Inter, sans-serif',
            },
            formatter: (text, op) => {
              const totalArea = op.w.globals.gridWidth * op.w.globals.gridHeight;
              const seriesTotal = op.w.globals.seriesTotals[0];
              if (seriesTotal === 0) return '';
              const boxArea = (op.value / seriesTotal) * totalArea;
              if (boxArea < totalArea * 0.015) { // Hide label if it takes less than 1.5% of the area
                return '';
              }
              return [String(text), new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(op.value)];
            },
            offsetY: -4
        },
        tooltip: {
            custom: function({ dataPointIndex }) {
                const item = fullSeriesData[dataPointIndex];
                if (!item) return '';

                let label = 'Product Line';
                const unitLabel = 'Units Sold';

                return `
                  <div class="p-2 rounded-lg bg-secondary-bg dark:bg-dark-secondary-bg text-primary-text dark:text-dark-primary-text font-sans border border-border-color dark:border-dark-border-color shadow-lg text-sm">
                      <div class="font-bold mb-1">${label}: ${item.x}</div>
                      <div class="grid grid-cols-[auto,1fr] gap-x-4">
                        <span>${metricLabel}:</span>
                        <span class="font-semibold text-right">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.y)}</span>
                        <span>${unitLabel}:</span>
                        <span class="font-semibold text-right">${item.units.toLocaleString()}</span>
                      </div>
                  </div>
                `;
            }
        },
    };
    
    const chartContent = (
        <div className={`w-full ${inModal ? 'h-full' : 'h-[300px] lg:h-[350px]'} px-2`}>
            {series.length === 0 || series[0].data.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-secondary-text">
                    <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                    <p className="text-sm">No data available for this view.</p>
                </div>
            ) : (
                <ReactApexChart
                    options={options}
                    series={series}
                    type="treemap"
                    height="100%"
                    width="100%"
                    key={`${metric}`}
                />
            )}
        </div>
    );

    return (
        <Card className="p-0 flex flex-col">
            <div className="p-4 sm:p-6 pb-2">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-primary-text dark:text-dark-primary-text tracking-tight">{title}</h3>
                        <p className="text-sm text-secondary-text dark:text-dark-secondary-text">{breadcrumbs}</p>
                    </div>
                </div>
            </div>
            {chartContent}
        </Card>
    );
};

export default ProductHierarchyChart;