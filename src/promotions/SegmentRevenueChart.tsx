
import React from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

interface SegmentRevenueChartProps {
    segments: { name: string; revenue: number }[];
}

const SegmentRevenueChart: React.FC<SegmentRevenueChartProps> = ({ segments }) => {
    if (segments.length === 0) {
        return <div className="flex items-center justify-center h-full text-center text-xs text-secondary-text">No segment data</div>;
    }
    
    const totalRevenue = segments.reduce((sum, s) => sum + s.revenue, 0);
    const series = segments.map(s => s.revenue);
    const labels = segments.map(s => s.name);

    const options: ApexOptions = {
        chart: {
            type: 'donut',
            height: '100%',
            fontFamily: 'Inter, sans-serif',
        },
        series,
        labels,
        plotOptions: {
            pie: {
                donut: {
                    size: '75%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total Revenue',
                            fontSize: '0.75rem',
                            color: '#4B5563',
                            formatter: () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalRevenue),
                        },
                        value: {
                            show: true,
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            color: '#1F2937',
                            formatter: (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(val)),
                        }
                    }
                }
            }
        },
        dataLabels: { enabled: false },
        legend: { show: false },
        tooltip: {
            y: {
                formatter: (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val),
            }
        },
        states: {
            hover: {
                filter: { type: 'lighten', value: 0.05 } as any
            }
        },
    };

    return (
        <ReactApexChart
            options={options}
            series={series}
            type="donut"
            height="100%"
            width="100%"
        />
    );
};

export default SegmentRevenueChart;