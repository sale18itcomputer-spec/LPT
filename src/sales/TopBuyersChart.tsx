
import React, { useMemo, useContext, useState, useId } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, Treemap } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import type { Sale } from '../../types';
import { DocumentMagnifyingGlassIcon, ChartBarIcon, TableCellsIcon, ClipboardDocumentListIcon } from '../ui/Icons';
import { ThemeContext } from '../../contexts/ThemeContext';
import ChartCard from '../ui/ChartCard';
import SegmentedControl from '../ui/SegmentedControl';

type SortBy = 'revenue' | 'units';
type ViewMode = 'bar' | 'treemap' | 'table';

// Formatters
const currencyFormatter = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
const compactCurrencyFormatter = (val: unknown) => {
    if (typeof val !== 'number') return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);
}
const compactNumberFormatter = (val: unknown) => {
    if (typeof val !== 'number') return '';
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(val);
}

// View Mode Button
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

// View Mode Switcher
const ViewModeSwitcher: React.FC<{ viewMode: ViewMode; setViewMode: (mode: ViewMode) => void }> = ({
  viewMode,
  setViewMode,
}) => {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex gap-1 p-1 bg-gray-100 dark:bg-dark-secondary-bg/50 rounded-lg">
      <div id={id} className="sr-only">Chart View Mode</div>
      <ViewModeButton active={viewMode === 'bar'} onClick={() => setViewMode('bar')} icon={ChartBarIcon} label="Bar Chart (Top 15)" />
      <ViewModeButton active={viewMode === 'treemap'} onClick={() => setViewMode('treemap')} icon={TableCellsIcon} label="Treemap" />
      <ViewModeButton active={viewMode === 'table'} onClick={() => setViewMode('table')} icon={ClipboardDocumentListIcon} label="Table" />
    </div>
  );
};

// Custom Tooltip
const CustomTooltipContent = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white/90 dark:bg-dark-secondary-bg/90 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-border-color dark:border-dark-border-color text-sm">
      <p className="font-bold text-primary-text dark:text-dark-primary-text truncate max-w-xs">{data.name}</p>
      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs mt-2">
        <span className="text-secondary-text dark:text-dark-secondary-text">Revenue:</span>
        <span className="font-semibold text-right text-primary-text dark:text-dark-primary-text">
          {currencyFormatter(data.revenue)}
        </span>
        <span className="text-secondary-text dark:text-dark-secondary-text">Units:</span>
        <span className="font-semibold text-right text-primary-text dark:text-dark-primary-text">
          {data.units.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

// Data Table
const DataTable: React.FC<{ data: any[]; sortBy: 'revenue' | 'units'; onRowClick: (name: string) => void }> = ({
  data,
  sortBy,
  onRowClick,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return data.filter((item) => item.name.toLowerCase().includes(term));
  }, [data, searchTerm]);

  return (
    <div className="h-full flex flex-col">
      <input
        type="text"
        placeholder="Search buyers..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight text-sm mb-2 bg-primary-bg dark:bg-dark-secondary-bg"
        aria-label="Search buyers"
      />
      <div className="flex-grow overflow-auto custom-scrollbar border border-border-color dark:border-dark-border-color rounded-lg">
        <table className="w-full text-sm" role="grid">
          <thead className="bg-gray-50 dark:bg-dark-secondary-bg/50 sticky top-0">
            <tr className="text-xs text-secondary-text dark:text-dark-secondary-text uppercase">
              <th className="px-3 py-2 text-left font-semibold">Buyer</th>
              <th className="px-3 py-2 text-right font-semibold">Revenue</th>
              <th className="px-3 py-2 text-right font-semibold">Units</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color dark:divide-dark-border-color">
            {filteredData.map((item) => (
              <tr
                key={item.name}
                className="hover:bg-gray-50 dark:hover:bg-dark-primary-bg cursor-pointer transition-colors"
                onClick={() => onRowClick(item.name)}
                onKeyDown={(e) => e.key === 'Enter' && onRowClick(item.name)}
                role="row"
                tabIndex={0}
              >
                <td className="px-3 py-2 font-semibold text-primary-text dark:text-dark-primary-text">{item.name}</td>
                <td className="px-3 py-2 text-right font-medium text-primary-text dark:text-dark-primary-text">{compactCurrencyFormatter(item.revenue)}</td>
                <td className="px-3 py-2 text-right font-medium text-primary-text dark:text-dark-primary-text">{compactNumberFormatter(item.units)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PALETTE = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#14B8A6'];

// Main Component
interface TopBuyersChartProps {
  sales: Sale[];
  onBuyerSelect: (buyer: string | null) => void;
  selectedBuyer: string | null;
}

const TopBuyersChart: React.FC<TopBuyersChartProps> = React.memo(
  ({ sales, onBuyerSelect, selectedBuyer }) => {
    const [sortBy, setSortBy] = useState<SortBy>('revenue');
    const [viewMode, setViewMode] = useState<ViewMode>('bar');
    const themeContext = useContext(ThemeContext);
    const isDark = themeContext?.theme === 'dark';

    const topBuyersData = useMemo(() => {
        const aggregated = sales.reduce((acc: Record<string, { revenue: number; units: number }>, s: Sale) => {
            if (s.buyerName === 'N/A') return acc;
            if (!acc[s.buyerName]) {
                acc[s.buyerName] = { revenue: 0, units: 0 };
            }
            acc[s.buyerName].revenue += s.totalRevenue;
            acc[s.buyerName].units += s.quantity;
            return acc;
        }, {});
  
      return Object.entries(aggregated)
        .map(([name, { revenue, units }]) => ({
          name,
          revenue,
          units,
        }))
        .sort((a, b) => b[sortBy] - a[sortBy]);
    }, [sales, sortBy]);

    const chartData = useMemo(() => {
        return topBuyersData.slice(0, 15);
    }, [topBuyersData]);

    const handleBarClick = (data: any) => {
      if (data?.activePayload?.[0]?.payload?.name) {
        const name = data.activePayload[0].payload.name;
        onBuyerSelect(selectedBuyer === name ? null : name);
      }
    };

    // Treemap View
    const TreemapView: React.FC<{ data: any[]; sortBy: 'revenue' | 'units' }> = ({ data, sortBy }) => {
        const CustomTreemapContent = (props: any) => {
            const { x, y, width, height, index } = props;
            const item = data[index];
            if (!item || width < 30 || height < 30) return null;

            const value = item[sortBy];
            const label = item.name;
            const displayValue = sortBy === 'units' ? compactNumberFormatter(value) : compactCurrencyFormatter(value);
            
            const color = PALETTE[index % PALETTE.length];
            const isSelected = selectedBuyer === item.name;
            const isDimmed = selectedBuyer && !isSelected;

            return (
            <g
                opacity={isDimmed ? 0.4 : 1}
                onClick={() => onBuyerSelect(isSelected ? null : item.name)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onBuyerSelect(isSelected ? null : item.name)}
            >
                <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={color}
                stroke={isSelected ? '#4f46e5' : '#fff'}
                strokeWidth={isSelected ? 3 : 2}
                rx={4}
                ry={4}
                className="hover:opacity-80 transition-all"
                />
                {width > 80 && height > 50 && (
                <>
                    <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="600" style={{ pointerEvents: 'none' }}>
                    {label.length > 15 ? `${label.slice(0, 15)}...` : label}
                    </text>
                    <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#fff" fontSize={11} style={{ pointerEvents: 'none' }}>
                    {displayValue}
                    </text>
                </>
                )}
            </g>
            );
        };

        return (
            <ResponsiveContainer width="100%" height="100%">
            <Treemap
                data={data}
                dataKey={sortBy}
                stroke="#fff"
                content={<CustomTreemapContent />}
            >
                <Tooltip content={<CustomTooltipContent />} />
            </Treemap>
            </ResponsiveContainer>
        );
    };


    if (topBuyersData.length === 0) {
      return (
        <ChartCard title="Customer Insights: Top Buyers" description="Ranked by revenue or units." className="h-[450px]">
            <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center">
            <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
            <p className="text-sm">No buyer data available.</p>
            </div>
        </ChartCard>
      );
    }

    return (
    <ChartCard
      title="Customer Insights: Top Buyers"
      description={`Ranked by ${sortBy}`}
      controls={
        <>
          <SegmentedControl 
            value={sortBy} 
            onChange={v => setSortBy(v as SortBy)} 
            options={[
                {label:'Revenue', value:'revenue'}, 
                {label:'Units', value:'units'}
            ]} 
            label="Sort By" 
          />
          <ViewModeSwitcher viewMode={viewMode} setViewMode={setViewMode} />
        </>
      }
      className="flex flex-col h-[560px]"
    >
      <div aria-live="polite" className="sr-only">
        Viewing {viewMode} of top buyers sorted by {sortBy}.
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="flex-grow min-h-0 pt-2"
        >
          {viewMode === 'bar' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 80, left: 0, bottom: 5 }}
                onClick={handleBarClick}
              >
                <defs>
                  <linearGradient id="buyer-bar-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={isDark ? '#3b82f6' : '#60a5fa'} />
                    <stop offset="100%" stopColor={isDark ? '#1d4ed8' : '#2563eb'} />
                  </linearGradient>
                </defs>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: isDark ? '#d4d4d8' : '#4b5563', fontWeight: 500 }}
                  width={140}
                  tickFormatter={(v) => (v.length > 20 ? `${v.substring(0, 18)}...` : v)}
                />
                <Tooltip content={<CustomTooltipContent />} cursor={{ fill: isDark ? 'rgba(128,128,128,0.1)' : 'rgba(229,231,235,0.5)' }} />
                <Bar
                  dataKey={sortBy}
                  fill="url(#buyer-bar-gradient)"
                  barSize={16}
                  radius={[0, 4, 4, 0] as any}
                  background={{ fill: isDark ? '#374151' : '#f3f4f6' }}
                >
                  <LabelList
                    dataKey={sortBy}
                    position="right"
                    formatter={(value: unknown) => {
                        if (typeof value !== 'number') return null;
                        return sortBy === 'revenue' ? compactCurrencyFormatter(value) : compactNumberFormatter(value);
                    }}
                    style={{ fontSize: 12, fontWeight: '600', fill: isDark ? '#f1f5f9' : '#0f172a' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {viewMode === 'treemap' && <TreemapView data={topBuyersData} sortBy={sortBy} />}
          {viewMode === 'table' && <DataTable data={topBuyersData} sortBy={sortBy} onRowClick={onBuyerSelect} />}
        </motion.div>
      </AnimatePresence>
    </ChartCard>
    );
  }
);

TopBuyersChart.displayName = 'TopBuyersChart';

export default TopBuyersChart;
