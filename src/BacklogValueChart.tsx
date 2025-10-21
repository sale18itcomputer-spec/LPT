import React, { useMemo, useContext } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { Order } from '../types';
import { DocumentMagnifyingGlassIcon } from './ui/Icons';
import { ThemeContext } from '../contexts/ThemeContext';

interface BacklogValueChartProps {
  orders: Order[];
  inModal?: boolean;
}

const BacklogValueChart: React.FC<BacklogValueChartProps> = ({ orders, inModal = false }) => {
  const themeContext = useContext(ThemeContext);
  const { theme } = themeContext!;
  const isDark = theme === 'dark';

  const labelColor = isDark ? '#d4d4d8' : '#4B5563';
  const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';

  const { series, categories } = useMemo(() => {
    const ageBuckets = ['0-30 days', '31-60 days', '61-90 days', '91-120 days', '120+ days'];
    const productLineData: Record<string, number[]> = {};
    const allProductLines = new Set<string>();
    const today = new Date().getTime();

    const backlogOrders = orders.filter(order => !order.actualArrival && order.dateIssuePI);

    backlogOrders.forEach(order => {
        const piDate = new Date(order.dateIssuePI!).getTime();
        const age = (today - piDate) / (1000 * 60 * 60 * 24);

        let bucketIndex: number;
        if (age <= 30) bucketIndex = 0;
        else if (age <= 60) bucketIndex = 1;
        else if (age <= 90) bucketIndex = 2;
        else if (age <= 120) bucketIndex = 3;
        else bucketIndex = 4;
        
        const pl = order.productLine;
        allProductLines.add(pl);

        if (!productLineData[pl]) {
            productLineData[pl] = new Array(ageBuckets.length).fill(0);
        }
        productLineData[pl][bucketIndex] += order.orderValue;
    });

    const sortedProductLines = Array.from(allProductLines).sort();

    const series = sortedProductLines.map(pl => ({
        name: pl,
        data: productLineData[pl]
    }));

    return { series, categories: ageBuckets };
  }, [orders]);

  if (series.length === 0 || series.every(s => s.data.every(d => d === 0))) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-secondary-text p-4 text-center">
        <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
        <p className="text-sm">No open order backlog found.</p>
      </div>
    );
  }

  const options: ApexOptions = {
    chart: {
        type: 'bar',
        height: '100%',
        stacked: true,
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
    },
    plotOptions: {
        bar: {
            horizontal: false,
            columnWidth: '60%',
        },
    },
    xaxis: {
        categories: categories,
        title: {
            text: 'Order Age (from PI Date)',
            style: { color: labelColor, fontSize: '0.75rem', fontWeight: 500 },
        },
        labels: {
            style: { colors: labelColor, fontSize: '0.75rem' },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
    },
    yaxis: {
        title: {
            text: 'Backlog Value (USD)',
            style: { color: labelColor, fontSize: '0.75rem', fontWeight: 500 }
        },
        labels: {
            style: { colors: labelColor, fontSize: '0.75rem' },
            formatter: (val) => val.toLocaleString('en-US'),
        },
    },
    grid: {
        borderColor: gridBorderColor,
        strokeDashArray: 4,
        padding: { left: 10, right: 20 }
    },
    dataLabels: { enabled: false },
    legend: {
        position: 'top',
        horizontalAlign: 'left',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        itemMargin: { horizontal: 10, vertical: 5 },
        labels: {
            colors: labelColor
        }
    },
    tooltip: {
        y: {
            formatter: (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val),
        },
        x: {
            formatter: (val) => `${val}`
        }
    },
    responsive: [
        {
            breakpoint: 640,
            options: {
                legend: {
                    position: 'bottom',
                    horizontalAlign: 'center',
                }
            }
        }
    ]
  };

  return (
    <div className="w-full h-full">
      <ReactApexChart
        options={options}
        series={series}
        type="bar"
        height="100%"
        width="100%"
      />
    </div>
  );
};

export default BacklogValueChart;