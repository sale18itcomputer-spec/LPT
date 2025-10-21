import React, { useContext } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { DocumentMagnifyingGlassIcon } from '../ui/Icons';
import Card from '../ui/Card';
import { ThemeContext } from '../../contexts/ThemeContext';

interface ChartData {
    name: string;
    margin: number;
    count: number;
}

interface ProfitabilityChartProps {
    data: ChartData[];
}

const ProfitabilityChart: React.FC<ProfitabilityChartProps> = ({ data }) => {
    const themeContext = useContext(ThemeContext);
    const { theme } = themeContext!;
    const isDark = theme === 'dark';
    
    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const dataLabelColor = isDark ? '#f9fafb' : '#1F2937';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';


    if (data.length === 0) {
        return (
            <Card className="h-full">
                <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center">
                    <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                    <p className="text-sm">No profitability data to display for the current filters.</p>
                </div>
            </Card>
        );
    }
    
    const series = [{
        name: 'Weighted Avg. Margin',
        data: data.map(d => parseFloat(d.margin.toFixed(1)))
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
                dataLabels: {
                    position: 'top',
                },
            },
        },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => `${val}%`,
            offsetX: 15,
            style: {
                fontSize: '0.75rem',
                fontWeight: '600',
                colors: [dataLabelColor]
            }
        },
        xaxis: {
            categories: data.map(d => d.name),
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                show: true,
                style: {
                    colors: labelColor,
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                },
            }
        },
        grid: {
            show: true,
            borderColor: gridBorderColor,
            strokeDashArray: 0,
             xaxis: {
                lines: { show: true }
            },
            yaxis: {
                lines: { show: false }
            },
            padding: { top: 0, right: 40, bottom: 0, left: 10 }
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
                    { offset: 0, color: "#3B82F6", opacity: 1 },
                    { offset: 100, color: "#60A5FA", opacity: 1 }
                ]
            },
        },
        tooltip: {
            theme: theme,
            enabled: true,
            custom: function({ seriesIndex, dataPointIndex, w }) {
                const item = data[dataPointIndex];
                if (!item) return '';
                return `
                  <div class="p-2 rounded-lg bg-secondary-bg dark:bg-dark-secondary-bg text-primary-text dark:text-dark-primary-text font-sans border border-border-color dark:border-dark-border-color shadow-lg">
                      <div class="font-bold text-base">${item.name}</div>
                      <div><strong>Avg. Margin:</strong> ${item.margin.toFixed(2)}%</div>
                      <div class="mt-1 border-t border-border-color dark:border-dark-border-color pt-1">Based on ${item.count} MTM(s)</div>
                  </div>
                `;
            }
        },
    };

    return (
        <Card title="Profitability by Product Line" description="Weighted avg. SDP margin of on-hand stock" className="h-full">
            <div className="h-full">
                <ReactApexChart
                    options={options}
                    series={series}
                    type="bar"
                    height="100%"
                    width="100%"
                />
            </div>
        </Card>
    );
};

export default ProfitabilityChart;