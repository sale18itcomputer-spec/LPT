import React from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

interface HistoricalSalesChartProps {
    dailySales: { date: string; revenue: number }[];
}

const HistoricalSalesChart: React.FC<HistoricalSalesChartProps> = ({ dailySales }) => {
    
    const series = [{
        name: 'Revenue',
        data: dailySales.map(d => d.revenue)
    }];

    const options: ApexOptions = {
        chart: {
            type: 'bar',
            height: '100%',
            fontFamily: 'Inter, sans-serif',
            toolbar: { show: false },
            sparkline: { enabled: true }
        },
        plotOptions: {
            bar: {
                columnWidth: '80%',
                borderRadius: 4,
            }
        },
        colors: ['#A5B4FC'],
        dataLabels: { enabled: false },
        xaxis: {
            categories: dailySales.map(d => d.date),
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: { show: false },
        grid: { show: false },
        tooltip: {
            enabled: true,
            custom: function({ series, seriesIndex, dataPointIndex }) {
                const saleData = dailySales[dataPointIndex];
                if (!saleData) return '';
                const date = new Date(saleData.date);
                const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                const revenueString = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(saleData.revenue);
    
                return `
                    <div class="px-2 py-1 bg-secondary-bg text-primary-text font-sans text-sm border border-border-color shadow-md rounded-md">
                        <div><strong>${dateString}:</strong> ${revenueString}</div>
                    </div>
                `;
            }
        },
        states: {
            hover: {
                filter: { type: 'lighten', value: 0.1 } as any
            }
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

export default HistoricalSalesChart;