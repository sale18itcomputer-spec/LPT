
import React, { useMemo, useContext, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { DocumentMagnifyingGlassIcon } from '../ui/Icons';
import type { Order } from '../../types';
import { ThemeContext } from '../../contexts/ThemeContext';

interface GanttChartProps {
  orders: Order[];
  inModal?: boolean;
}

const ShipmentGanttChart: React.FC<GanttChartProps> = ({ orders, inModal = false }) => {
  const themeContext = useContext(ThemeContext);
  const chartRef = useRef<ReactECharts>(null);
  const isDark = themeContext?.theme === 'dark';

  // Colors
  const colors = {
    planned: isDark ? '#6366F1' : '#818CF8', // Indigo
    actualOnTime: isDark ? '#10B981' : '#34D399', // Emerald
    actualDelayed: isDark ? '#F87171' : '#FCA5A5', // Red
    text: isDark ? '#E4E4E7' : '#3F3F46',
    label: isDark ? '#A1A1AA' : '#71717A',
    axisLine: isDark ? '#3F3F46' : '#E5E7EB',
    gridLine: isDark ? '#27272A' : '#E5E7EB',
    tooltipBg: isDark ? 'rgba(39, 39, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)',
    tooltipBorder: isDark ? '#3F3F46' : '#E4E4E7',
  };

  // Force resize on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      chartRef.current?.getEchartsInstance().resize();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const chartData = useMemo(() => {
    // FIX: Cast `orders` to `Order[]` to resolve type inference issue with `reduce`.
    const groupedBySO = (orders as Order[]).reduce((acc, order) => {
      if (!acc[order.salesOrder]) acc[order.salesOrder] = [];
      acc[order.salesOrder].push(order);
      return acc;
    }, {} as Record<string, Order[]>);

    const processedData = Object.entries(groupedBySO)
      .map(([salesOrder, orderItems]) => {
        const dates = orderItems.reduce(
          (acc, item) => {
            if (item.dateIssuePI) acc.pis.push(new Date(item.dateIssuePI + 'T00:00:00Z'));
            if (item.ShipDate) acc.ships.push(new Date(item.ShipDate + 'T00:00:00Z'));
            if (item.actualArrival) acc.arrivals.push(new Date(item.actualArrival + 'T00:00:00Z'));
            return acc;
          },
          { pis: [] as Date[], ships: [] as Date[], arrivals: [] as Date[] }
        );

        if (dates.pis.length === 0 || dates.ships.length === 0) return null;

        const earliestPI = new Date(Math.min(...dates.pis.map(d => d.getTime())));
        const latestPlannedShip = new Date(Math.max(...dates.ships.map(d => d.getTime())));
        const latestActualArrival = dates.arrivals.length > 0
          ? new Date(Math.max(...dates.arrivals.map(d => d.getTime())))
          : null;

        const isDelayed = latestActualArrival && latestActualArrival > latestPlannedShip;
        const durationPlanned = (latestPlannedShip.getTime() - earliestPI.getTime()) / (1000 * 60 * 60 * 24);
        const durationActual = latestActualArrival
          ? (latestActualArrival.getTime() - earliestPI.getTime()) / (1000 * 60 * 60 * 24)
          : null;

        return {
          salesOrder,
          earliestPI,
          latestPlannedShip,
          latestActualArrival,
          isDelayed,
          durationPlanned: Math.round(durationPlanned),
          durationActual: durationActual ? Math.round(durationActual) : null,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    const sortedData = processedData
      .sort((a, b) => a.earliestPI.getTime() - b.earliestPI.getTime())
      .slice(-15); // Most recent 15

    const categories = sortedData.map(d => d.salesOrder);

    const plannedSeriesData = sortedData.map((d, i) => ({
      name: d.salesOrder,
      value: [i, d.earliestPI.getTime(), d.latestPlannedShip.getTime(), null],
      itemStyle: { color: colors.planned },
      duration: d.durationPlanned,
    }));

    const actualSeriesData = sortedData
      .map((d, i) => {
        if (!d.latestActualArrival) return null;
        return {
          name: d.salesOrder,
          value: [i, d.earliestPI.getTime(), d.latestActualArrival.getTime(), d.isDelayed ? 1 : 0],
          itemStyle: { color: d.isDelayed ? colors.actualDelayed : colors.actualOnTime },
          duration: d.durationActual,
          isDelayed: d.isDelayed,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    return { categories, plannedSeriesData, actualSeriesData };
  }, [orders, isDark, colors.planned, colors.actualDelayed, colors.actualOnTime]);

  if (chartData.categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fadeIn">
        <div className="relative">
          <DocumentMagnifyingGlassIcon className="h-14 w-14 text-gray-400 mb-3 animate-pulse" />
          <div className="absolute inset-0 blur-xl bg-blue-500 opacity-20 animate-ping"></div>
        </div>
        <p className="text-sm text-secondary-text font-medium">No shipment data available</p>
        <p className="text-xs text-gray-500 mt-1">Select orders with valid PI and shipment dates</p>
      </div>
    );
  }

  const renderGanttItem = (params: any, api: any) => {
    const categoryIndex = api.value(0);
    const timeStart = api.value(1);
    const timeEnd = api.value(2);
    const isDelayedVal = api.value(3);
    const start = api.coord([timeStart, categoryIndex]);
    const end = api.coord([timeEnd, categoryIndex]);
    const barHeight = api.size([0, 1])[1] * 0.55;
    const borderRadius = 6;

    const isPlanned = params.seriesName === 'Planned';
    const yOffset = isPlanned ? -barHeight * 0.6 : barHeight * 0.6;
    const y = start[1] + yOffset;

    const width = end[0] - start[0];
    const height = barHeight * 0.9;

    const rectShape = {
      x: start[0],
      y,
      width,
      height,
      r: borderRadius,
    };

    const style = api.style({
      fill: api.visual('color'),
      stroke: isPlanned ? 'transparent' : api.visual('color'),
      lineWidth: isPlanned ? 0 : 2,
      shadowBlur: 8,
      shadowColor: 'rgba(0, 0, 0, 0.3)',
    });

    // Add progress dot for actual
    let children: any[] = [];
    if (!isPlanned && isDelayedVal !== null) {
      const isDelayed = isDelayedVal === 1;
      const dotX = end[0] + 8;
      const dotY = y + height / 2;
      children.push({
        type: 'circle' as const,
        shape: { cx: dotX, cy: dotY, r: 5 },
        style: {
          fill: isDelayed ? '#F87171' : '#34D399',
          stroke: '#fff',
          lineWidth: 2,
        },
        silent: true,
      });
    }

    return {
      type: 'group' as const,
      children: [
        {
          type: 'rect' as const,
          shape: rectShape,
          style,
          transition: ['shape', 'style'],
        },
        ...children,
      ],
    };
  };

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: isDark ? '#f9fafb' : '#18181b', fontSize: 13, fontFamily: 'Inter, sans-serif' },
      extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);',
      formatter: (params: any) => {
        const { name, value, seriesName } = params;
        const startDate = new Date(value[1]).toLocaleDateString('en-CA');
        const endDate = new Date(value[2]).toLocaleDateString('en-CA');
        const days = Math.round((value[2] - value[1]) / (1000 * 60 * 60 * 24));

        let status = '';
        if (seriesName === 'Actual') {
          const isDelayed = value[3] === 1;
          status = isDelayed
            ? `<span style="color:#F87171; font-weight:600;">Delayed</span>`
            : `<span style="color:#34D399; font-weight:600;">On Time</span>`;
        }

        return `
          <div style="font-family: Inter, sans-serif; min-width: 180px;">
            <div style="font-weight: 600; margin-bottom: 4px; color: ${colors.text};">${name}</div>
            <div style="font-size: 12px; color: ${colors.label}; margin-bottom: 6px;">
              <strong>${seriesName}</strong> Lead Time
            </div>
            <div style="font-size: 13px; line-height: 1.4;">
              ${startDate} → ${endDate}<br/>
              <strong>${days} day${days !== 1 ? 's' : ''}</strong>
              ${seriesName === 'Actual' ? `<br/>${status}` : ''}
            </div>
          </div>
        `;
      },
    },
    grid: {
      left: 100,
      right: 40,
      top: 60,
      bottom: 60,
      containLabel: false,
    },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: colors.axisLine } },
      axisTick: { show: false },
      axisLabel: {
        color: colors.label,
        fontSize: 12,
        formatter: (value: number) => {
          const date = new Date(value);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        },
      },
      splitLine: {
        show: true,
        lineStyle: { color: colors.gridLine, type: 'dashed', opacity: 0.4 },
      },
    },
    yAxis: {
      type: 'category',
      data: chartData.categories,
      axisLabel: {
        color: colors.text,
        fontSize: 13,
        fontWeight: 500,
        interval: 0,
        align: 'right',
        padding: [0, 0, 0, 8],
      },
      axisLine: { show: true, lineStyle: { color: colors.axisLine } },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    legend: {
      data: ['Planned', 'Actual'],
      top: 12,
      right: 40,
      textStyle: { color: colors.text, fontSize: 13, fontWeight: 500 },
      itemGap: 20,
      icon: 'roundRect',
      itemWidth: 16,
      itemHeight: 10,
      selectedMode: true,
    },
    series: [
      {
        name: 'Planned',
        type: 'custom',
        renderItem: renderGanttItem,
        encode: { x: [1, 2], y: 0 },
        data: chartData.plannedSeriesData,
        z: 1,
        itemStyle: { borderRadius: 6 },
      },
      {
        name: 'Actual',
        type: 'custom',
        renderItem: renderGanttItem,
        encode: { x: [1, 2], y: 0 },
        data: chartData.actualSeriesData,
        z: 2,
        itemStyle: { borderRadius: 6 },
      },
    ],
  };

  return (
    <div className="h-full w-full relative">
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: '100%', width: '100%' }}
        notMerge={true}
        lazyUpdate={true}
        theme={isDark ? 'dark' : undefined}
      />
      {/* Optional: Subtle title */}
      {!inModal && (
        <div className="absolute top-4 left-8 text-xs font-medium text-gray-500 uppercase tracking-wider">
          Shipment Timeline (Last 15 Orders)
        </div>
      )}
    </div>
  );
};

ShipmentGanttChart.displayName = 'ShipmentGanttChart';
export default ShipmentGanttChart;
