import React from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { DocumentMagnifyingGlassIcon } from '../ui/Icons';

interface SurplusItem {
    mtm: string;
    modelName: string;
    inStockQty: number;
    historicalSales: number;
}

interface SurplusStockChartProps {
    surplusItems: SurplusItem[];
}

const SurplusStockChart: React.FC<SurplusStockChartProps> = ({ surplusItems }) => {
    if (surplusItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-secondary-text text-sm">
                <DocumentMagnifyingGlassIcon className="h-8 w-8 text-secondary-text mb-2"/>
                <p>No significant surplus inventory found.</p>
            </div>
        );
    }
    
    const sortedItems = [...surplusItems].sort((a,b) => a.inStockQty - b.inStockQty);

    const series = [{ 
        name: 'In Stock', 
        data: sortedItems.map(item => item.inStockQty) 
    }];

    const options: ApexOptions = {
        chart: {
            type: 'bar',
            height: '100%',
            fontFamily: 'Inter, sans-serif',
            toolbar: { show: false },
        },
        plotOptions: {
            bar: {
                horizontal: true,
                barHeight: '60%',
                borderRadius: 4,
            }
        },
        dataLabels: {
            enabled: true,
            formatter: (val) => val.toLocaleString(),
            offsetX: 10,
            style: {
                fontSize: '0.75rem',
                fontWeight: 600,
                colors: ['#1F2937']
            }
        },
        xaxis: {
            categories: sortedItems.map(item => item.modelName),
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                show: true,
                style: {
                    colors: '#4B5563',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                },
                formatter: (val) => {
                    const strVal = String(val);
                    return strVal && strVal.length > 20 ? `${strVal.substring(0, 18)}...` : strVal;
                },
            }
        },
        grid: {
            show: true,
            borderColor: '#E5E7EB',
            strokeDashArray: 0,
             xaxis: {
                lines: { show: true }
            },
            yaxis: {
                lines: { show: false }
            },
            padding: { right: 30, left: 10 }
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'light',
                type: "horizontal",
                shadeIntensity: 0.25,
                inverseColors: true,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [50, 0, 100],
                colorStops: [
                    { offset: 0, color: "#10B981", opacity: 1 },
                    { offset: 100, color: "#34D399", opacity: 1 }
                ]
            },
        },
        tooltip: {
            enabled: true,
            custom: function({ series, seriesIndex, dataPointIndex, w }) {
                const item = sortedItems[dataPointIndex];
                if (!item) return '';
                
                return `
                  <div class="p-2 rounded-lg bg-secondary-bg text-primary-text font-sans border border-border-color shadow-lg">
                      <div class="font-bold text-base mb-1">${item.modelName}</div>
                      <div class="grid grid-cols-2 gap-x-4 text-sm">
                        <span>In Stock:</span><span class="font-semibold text-right">${item.inStockQty.toLocaleString()}</span>
                        <span>Last Year Sales:</span><span class="font-semibold text-right">${item.historicalSales.toLocaleString()}</span>
                      </div>
                  </div>
                `;
            }
        },
        states: {
            hover: {
                filter: { type: 'lighten', value: 0.05 } as any,
            },
        }
    };

    return (
        <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height="100%"
            width="100%"
        />
    );
};

export default SurplusStockChart;