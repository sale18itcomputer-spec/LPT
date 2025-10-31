
import React, { useMemo, useState, useContext, useId } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, Treemap, RadialBarChart, PolarAngleAxis, RadialBar, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import type { Sale } from '../../types';
import ChartCard from '../ui/ChartCard';
import SegmentedControl from '../ui/SegmentedControl';
import { getISOWeek } from '../../utils/dateHelpers';
import { ThemeContext } from '../../contexts/ThemeContext';
import { DocumentMagnifyingGlassIcon, ChartBarIcon, TableCellsIcon, ClipboardDocumentListIcon } from '../ui/Icons';
import AnimatedCounter from '../ui/AnimatedCounter';

interface PeriodData {
  period: string;
  name: string; // for recharts
  revenue: number;
  growth: number | null;
  sortKey: string;
  // FIX: Add index signature to satisfy Recharts' Treemap data type requirement.
  [key: string]: any;
}

type PeriodType = 'quarterly' | 'monthly' | 'weekly' | 'daily';
type ViewMode = 'bar' | 'treemap' | 'table';

// Formatters
const compactCurrency = (val: unknown) => {
    if (typeof val !== 'number') return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);
}

// View Mode Switcher
const ViewModeButton: React.FC<{ active: boolean; onClick: () => void; icon: React.FC<any>; label: string }> = ({
  active,
  onClick,
  icon: Icon,
  label,
}) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    aria-label={label}
    className={`p-2 rounded-lg transition-all ${
      active
        ? 'bg-indigo-100 text-indigo-600 dark:bg-dark-highlight-hover dark:text-highlight'
        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-dark-secondary-bg dark:text-dark-secondary-text dark:hover:bg-dark-primary-bg'
    }`}
  >
    <Icon className="h-5 w-5" />
  </button>
);

const ViewModeSwitcher: React.FC<{ viewMode: ViewMode; setViewMode: (mode: ViewMode) => void }> = ({
  viewMode,
  setViewMode,
}) => {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex gap-1 p-1 bg-gray-100 dark:bg-dark-secondary-bg/50 rounded-lg">
      <div id={id} className="sr-only">Chart View Mode</div>
      <ViewModeButton active={viewMode === 'bar'} onClick={() => setViewMode('bar')} icon={ChartBarIcon} label="Bar Chart" />
      <ViewModeButton active={viewMode === 'treemap'} onClick={() => setViewMode('treemap')} icon={TableCellsIcon} label="Treemap" />
      <ViewModeButton active={viewMode === 'table'} onClick={() => setViewMode('table')} icon={ClipboardDocumentListIcon} label="Table" />
    </div>
  );
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.[0]) return null;
  const { revenue, growth } = payload[0].payload;
  const isPositive = growth !== null && growth >= 0;

  return (
    <div className="bg-white/90 dark:bg-dark-secondary-bg/90 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-border-color dark:border-dark-border-color text-sm">
      <p className="font-bold text-primary-text dark:text-dark-primary-text">{label}</p>
      <div className="mt-1 space-y-1">
        <div className="flex justify-between">
          <span>Revenue:</span>
          <span className="font-semibold ml-4 text-primary-text dark:text-dark-primary-text">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(revenue)}
          </span>
        </div>
        {growth !== null && (
          <div className="flex justify-between pt-1 border-t border-border-color dark:border-dark-border-color">
            <span>Growth:</span>
            <span className="font-semibold" style={{ color: isPositive ? '#10B981' : '#EF4444' }}>
              {isPositive ? 'Up' : 'Down'} {Math.abs(growth).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Table View
const DataTable: React.FC<{ data: PeriodData[] }> = ({ data }) => {
  return (
    <div className="h-full overflow-auto custom-scrollbar">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-dark-secondary-bg/50 sticky top-0">
          <tr className="text-xs text-secondary-text dark:text-dark-secondary-text uppercase">
            <th className="px-3 py-2 text-left font-semibold">Period</th>
            <th className="px-3 py-2 text-right font-semibold">Revenue</th>
            <th className="px-3 py-2 text-right font-semibold">Growth</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-color dark:divide-dark-border-color">
          {data.map((item) => {
            const isPositive = item.growth !== null && item.growth >= 0;
            return (
              <tr key={item.period} className="hover:bg-gray-50 dark:hover:bg-dark-primary-bg">
                <td className="px-3 py-2 font-medium text-primary-text dark:text-dark-primary-text">{item.period}</td>
                <td className="px-3 py-2 text-right font-medium text-primary-text dark:text-dark-primary-text">{compactCurrency(item.revenue)}</td>
                <td className="px-3 py-2 text-right">
                  {item.growth === null ? (
                    <span className="text-secondary-text">—</span>
                  ) : (
                    <span style={{ color: isPositive ? '#10B981' : '#EF4444' }}>
                      {isPositive ? 'Up' : 'Down'} {Math.abs(item.growth).toFixed(1)}%
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const PALETTE = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#14B8A6'];

// Treemap View
const TreemapView: React.FC<{ data: PeriodData[] }> = ({ data }) => {
  const CustomContent = (props: any) => {
    const { x, y, width, height, index } = props;
    const item = data[index];
    if (!item || width < 40 || height < 40) return null;

    const color = PALETTE[index % PALETTE.length];

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          stroke="#fff"
          strokeWidth={2}
          rx={4}
          ry={4}
          className="hover:opacity-80 transition-opacity"
        />
        {width > 90 && height > 60 && (
          <>
            <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="600" style={{ pointerEvents: 'none' }}>
              {item.period.length > 12 ? `${item.period.slice(0, 10)}...` : item.period}
            </text>
            <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#fff" fontSize={11} style={{ pointerEvents: 'none' }}>
              {compactCurrency(item.revenue)}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap data={data} dataKey="revenue" content={<CustomContent />}>
        <Tooltip content={<CustomTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );
};

// Main Component
interface SalesBySegmentChartProps {
  data: Sale[];
  onSegmentSelect: (segment: string | null) => void;
  selectedSegment: string | null;
}

const SalesBySegmentChart: React.FC<SalesBySegmentChartProps> = ({ data, onSegmentSelect, selectedSegment }) => {
    const themeContext = useContext(ThemeContext);
    const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    const compactCurrencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);


    const { segmentData, totalRevenue, maxSegmentValue, palette } = useMemo(() => {
        const aggregated = data.reduce((acc: Record<string, number>, sale: Sale) => {
            const segment = sale.segment || 'Unknown';
            if (segment === 'N/A') return acc;
            acc[segment] = (acc[segment] || 0) + sale.totalRevenue;
            return acc;
        }, {});
        
        const total = Object.values(aggregated).reduce((sum, val) => sum + val, 0);

        const sortedData = Object.entries(aggregated)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
            
        const generatePalette = (count: number) => {
            const baseHue = 221; // A rich blue
            const baseSaturation = 83;
            const newPalette: string[] = [];
            const lightnessStart = 85; 
            const lightnessEnd = 45;   
            const lightnessRange = lightnessStart - lightnessEnd;
            
            if (count === 0) return [];
            if (count === 1) return [`hsl(${baseHue}, ${baseSaturation}%, 60%)`];

            for (let i = 0; i < count; i++) {
                const step = i / (count - 1);
                const lightness = lightnessStart - (step * lightnessRange);
                newPalette.push(`hsl(${baseHue}, ${baseSaturation}%, ${lightness}%)`);
            }
            return newPalette;
        };
    
        const dynamicPalette = generatePalette(sortedData.length);

        return {
            totalRevenue: total,
            segmentData: sortedData,
            maxSegmentValue: sortedData[0]?.value || 1,
            palette: dynamicPalette,
        };
    }, [data]);
    
    // Data for the radial chart
    const chartData = useMemo(() => segmentData.map((d, i) => ({
        ...d,
        fill: palette[i % palette.length],
    })), [segmentData, palette]);
    
    const activeSegment = hoveredSegment || selectedSegment;
    const activeValue = activeSegment ? segmentData.find(s => s.name === activeSegment)?.value : totalRevenue;

    return (
        <div className="bg-secondary-bg dark:bg-dark-secondary-bg rounded-2xl shadow-lg shadow-primary-text/5 dark:shadow-black/20 border border-border-color dark:border-dark-border-color flex flex-col h-[560px]">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-border-color dark:border-dark-border-color">
                <h3 className="text-lg font-semibold text-primary-text dark:text-dark-primary-text tracking-tight">Sales by Segment</h3>
                <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1">
                    Total Revenue: <span className="font-bold">{currencyFormatter(totalRevenue)}</span>
                </p>
            </div>

            {/* Content */}
            <div className="flex-grow min-h-0 p-4 sm:p-6 flex flex-col md:flex-row gap-6">
                {/* Left: Legend List */}
                <div className="md:w-1/2 flex-grow min-h-0 overflow-y-auto custom-scrollbar -mr-3 pr-3 space-y-2">
                    {segmentData.map((segment, index) => {
                        const percentage = totalRevenue > 0 ? (segment.value / totalRevenue) * 100 : 0;
                        const barPercentage = (segment.value / maxSegmentValue) * 100;
                        const isSelected = selectedSegment === segment.name;
                        const isHovered = hoveredSegment === segment.name;
                        const isDimmed = selectedSegment && !isSelected;
                        const color = palette[index % palette.length];

                        return (
                            <motion.button
                                key={segment.name}
                                onClick={() => onSegmentSelect(isSelected ? null : segment.name)}
                                onMouseEnter={() => setHoveredSegment(segment.name)}
                                onMouseLeave={() => setHoveredSegment(null)}
                                className={`w-full text-left p-3 rounded-lg transition-all duration-200 border ${
                                    isSelected ? 'bg-highlight-hover dark:bg-dark-highlight-hover border-highlight/50' : 
                                    isHovered ? 'bg-gray-50 dark:bg-dark-secondary-bg/50 border-border-color dark:border-dark-border-color' :
                                    'bg-secondary-bg dark:bg-dark-secondary-bg border-transparent'
                                } ${isDimmed ? 'opacity-50' : ''}`}
                                whileHover={{ scale: 1.02 }}
                                layout
                            >
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></span>
                                        <span className="font-semibold text-primary-text dark:text-dark-primary-text">{segment.name}</span>
                                    </div>
                                    <span className="font-bold text-primary-text dark:text-dark-primary-text">{compactCurrencyFormatter(segment.value)}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="w-full bg-gray-200 dark:bg-dark-border-color rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full" style={{ width: `${barPercentage}%`, backgroundColor: color }}></div>
                                    </div>
                                    <span className="text-xs font-medium text-secondary-text dark:text-dark-secondary-text w-12 text-right">{percentage.toFixed(1)}%</span>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Right: Chart */}
                <div className="md:w-1/2 flex-1 min-h-[200px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="50%"
                            outerRadius="100%"
                            barSize={10}
                            data={chartData}
                            startAngle={90}
                            endAngle={-270}
                        >
                            <PolarAngleAxis
                                type="number"
                                domain={[0, maxSegmentValue]}
                                angleAxisId={0}
                                tick={false}
                            />
                            <RadialBar
                                background={{ fill: themeContext?.theme === 'dark' ? '#3f3f46' : '#e5e7eb' }}
                                dataKey="value"
                                cornerRadius={10}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.fill} 
                                        opacity={(selectedSegment && selectedSegment !== entry.name) ? 0.3 : 1}
                                        onMouseEnter={() => setHoveredSegment(entry.name)}
                                        onMouseLeave={() => setHoveredSegment(null)}
                                        onClick={() => onSegmentSelect(selectedSegment === entry.name ? null : entry.name)}
                                        style={{ cursor: 'pointer', transition: 'opacity 0.2s ease-in-out' }}
                                    />
                                ))}
                            </RadialBar>
                            <text
                                x="50%"
                                y="50%"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="transition-opacity duration-300"
                            >
                                <tspan
                                    x="50%"
                                    dy="-0.5em"
                                    className="text-xs fill-secondary-text dark:fill-dark-secondary-text font-medium"
                                >
                                    {activeSegment || 'Total Revenue'}
                                </tspan>
                                <tspan
                                    x="50%"
                                    dy="1.2em"
                                    className="text-2xl fill-primary-text dark:fill-dark-primary-text font-bold"
                                >
                                    <AnimatedCounter to={activeValue || 0} formatter={compactCurrencyFormatter} />
                                </tspan>
                            </text>
                        </RadialBarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default SalesBySegmentChart;
