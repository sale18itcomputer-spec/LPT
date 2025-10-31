
import React, { useState, useMemo, useContext, useId } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, Treemap } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import type { Sale } from '../../types';
import ChartCard from '../ui/ChartCard';
import SegmentedControl from '../ui/SegmentedControl';
import { ThemeContext } from '../../contexts/ThemeContext';
import { DocumentMagnifyingGlassIcon, ChartBarIcon, TableCellsIcon, ClipboardDocumentListIcon } from '../ui/Icons';

type SortBy = 'revenue' | 'units' | 'profit';
type ViewMode = 'bar' | 'treemap' | 'table';

// Formatters
const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
const compactCurrencyFormatter = (val: unknown) => {
    if (typeof val !== 'number') return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);
}
const compactNumberFormatter = (val: unknown) => {
    if (typeof val !== 'number') return '';
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(val);
}

// View Mode Button
const ViewModeButton: React.FC<{ active: boolean; onClick: () => void; icon: React.FC<any>; label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    aria-label={label}
    className={`p-2 rounded-lg transition-all ${active ? 'bg-indigo-100 text-indigo-600 dark:bg-dark-highlight-hover dark:text-highlight' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-dark-secondary-bg dark:text-dark-secondary-text dark:hover:bg-dark-primary-bg'}`}
  >
    <Icon className="h-5 w-5" />
  </button>
);

const ViewModeSwitcher: React.FC<{ viewMode: ViewMode; setViewMode: (mode: ViewMode) => void }> = ({ viewMode, setViewMode }) => {
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
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  const profitColor = data.margin === null ? 'inherit' : data.margin > 0 ? '#10B981' : '#EF4444';

  return (
    <div className="bg-white/90 dark:bg-dark-secondary-bg/90 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-border-color dark:border-dark-border-color text-sm">
      <p className="font-bold text-primary-text dark:text-dark-primary-text truncate max-w-xs">{data.modelName}</p>
      <p className="text-xs font-mono text-secondary-text dark:text-dark-secondary-text mb-2">{data.name}</p>
      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs">
        <span className="text-secondary-text dark:text-dark-secondary-text">Revenue:</span>
        <span className="font-semibold text-right text-primary-text dark:text-dark-primary-text">{currencyFormatter(data.revenue)}</span>
        <span className="text-secondary-text dark:text-dark-secondary-text">Units:</span>
        <span className="font-semibold text-right text-primary-text dark:text-dark-primary-text">{data.units.toLocaleString()}</span>
        {data.profit !== undefined && (
          <>
            <span className="text-secondary-text dark:text-dark-secondary-text">Profit:</span>
            <span className="font-semibold text-right" style={{ color: profitColor }}>{currencyFormatter(data.profit)}</span>
            <span className="text-secondary-text dark:text-dark-secondary-text">Margin:</span>
            <span className="font-semibold text-right" style={{ color: profitColor }}>
              {data.margin === null ? 'N/A' : `${data.margin.toFixed(1)}%`}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

// Data Table
const DataTable: React.FC<{ data: any[]; sortBy: SortBy; onRowClick: (name: string) => void }> = ({ data, sortBy, onRowClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return data.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.modelName.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  return (
    <div className="h-full flex flex-col">
      <input
        type="text"
        placeholder="Search models..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight text-sm mb-2 bg-primary-bg dark:bg-dark-secondary-bg"
        aria-label="Search models"
      />
      <div className="flex-grow overflow-auto custom-scrollbar border border-border-color dark:border-dark-border-color rounded-lg">
        <table className="w-full text-sm" role="grid">
          <thead className="bg-gray-50 dark:bg-dark-secondary-bg/50 sticky top-0">
            <tr className="text-xs text-secondary-text dark:text-dark-secondary-text uppercase">
              <th className="px-3 py-2 text-left font-semibold">Model</th>
              <th className="px-3 py-2 text-right font-semibold">Revenue</th>
              <th className="px-3 py-2 text-right font-semibold">Units</th>
              <th className="px-3 py-2 text-right font-semibold">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color dark:divide-dark-border-color">
            {filteredData.map((item) => (
              <tr
                key={item.name}
                className="hover:bg-gray-50 dark:hover:bg-dark-primary-bg cursor-pointer transition-colors"
                onClick={() => onRowClick(item.name)}
                role="row"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onRowClick(item.name)}
              >
                <td className="px-3 py-2">
                  <div className="font-semibold text-primary-text dark:text-dark-primary-text">{item.modelName}</div>
                  <div className="font-mono text-xs text-secondary-text dark:text-dark-secondary-text">{item.name}</div>
                </td>
                <td className="px-3 py-2 text-right font-medium text-primary-text dark:text-dark-primary-text">{compactCurrencyFormatter(item.revenue)}</td>
                <td className="px-3 py-2 text-right font-medium text-primary-text dark:text-dark-primary-text">{compactNumberFormatter(item.units)}</td>
                <td className="px-3 py-2 text-right font-medium text-primary-text dark:text-dark-primary-text">{item.profit !== undefined ? compactCurrencyFormatter(item.profit) : 'N/A'}</td>
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
interface TopSellingModelsChartProps {
  sales: Sale[];
  profitByMtm: Map<string, { totalProfit: number; totalRevenue: number }>;
  onModelSelect: (mtm: string | null) => void;
  selectedModel: string | null;
}

const TopSellingModelsChart: React.FC<TopSellingModelsChartProps> = ({
  sales,
  profitByMtm,
  onModelSelect,
  selectedModel,
}) => {
  const [sortBy, setSortBy] = useState<SortBy>('revenue');
  const [viewMode, setViewMode] = useState<ViewMode>('bar');
  const themeContext = useContext(ThemeContext);
  const isDark = themeContext?.theme === 'dark';

  const topModelsData = useMemo(() => {
    const aggregated = sales.reduce((acc: Record<string, { revenue: number; units: number; modelName: string }>, s: Sale) => {
      const mtm = s.lenovoProductNumber;
      if (mtm === 'N/A' || !mtm) return acc;
      if (!acc[mtm]) {
        acc[mtm] = { revenue: 0, units: 0, modelName: s.modelName };
      }
      acc[mtm].revenue += s.totalRevenue;
      acc[mtm].units += s.quantity;
      return acc;
    }, {});

    return Object.entries(aggregated)
      .map(([name, { revenue, units, modelName }]) => {
        const profitData = profitByMtm.get(name);
        const profit = profitData?.totalProfit;
        const margin = profit !== undefined && revenue > 0 ? (profit / revenue) * 100 : null;
        return { name, revenue, units, modelName, profit, margin };
      })
      .sort((a, b) => (b[sortBy] ?? -Infinity) - (a[sortBy] ?? -Infinity));
  }, [sales, profitByMtm, sortBy]);
  
  const chartData = useMemo(() => {
    return topModelsData.slice(0, 15);
  }, [topModelsData]);

  const handleBarClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload?.name) {
      const mtm = data.activePayload[0].payload.name;
      onModelSelect(selectedModel === mtm ? null : mtm);
    }
  };

  // Treemap View
  const TreemapView: React.FC<{ data: any[]; sortBy: SortBy }> = ({ data, sortBy }) => {
    const CustomTreemapContent = (props: any) => {
      const { x, y, width, height, index } = props;
      const item = data[index];
      if (!item || width < 30 || height < 30) return null;

      const value = item[sortBy] ?? 0;
      const label = item.modelName || '';
      const displayValue = sortBy === 'units' ? compactNumberFormatter(value) : compactCurrencyFormatter(value);
      
      const color = PALETTE[index % PALETTE.length];
      const isSelected = selectedModel === item.name;
      const isDimmed = selectedModel && !isSelected;

      return (
        <g
          opacity={isDimmed ? 0.4 : 1}
          onClick={() => onModelSelect(isSelected ? null : item.name)}
          className="cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onModelSelect(isSelected ? null : item.name)}
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
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    );
  };


  if (topModelsData.length === 0) {
    return (
      <ChartCard title="Top Selling Models" description="Ranked by revenue, units or profit." className="h-[450px]">
        <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center">
          <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
          <p className="text-sm">No sales data to display.</p>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Top Selling Models"
      description={`Ranked by ${sortBy}`}
      controls={
        <>
          <SegmentedControl
            value={sortBy}
            onChange={(v) => setSortBy(v as SortBy)}
            options={[
              { label: 'Revenue', value: 'revenue' },
              { label: 'Units', value: 'units' },
              { label: 'Profit', value: 'profit' },
            ]}
            label="Sort top models"
          />
          <ViewModeSwitcher viewMode={viewMode} setViewMode={setViewMode} />
        </>
      }
      className="flex flex-col h-[560px]"
    >
      <div aria-live="polite" className="sr-only">
        Viewing {viewMode} of top selling models sorted by {sortBy}.
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
                  <linearGradient id="top-models-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={isDark ? '#3b82f6' : '#60a5fa'} />
                    <stop offset="100%" stopColor={isDark ? '#1d4ed8' : '#2563eb'} />
                  </linearGradient>
                </defs>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="modelName"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: isDark ? '#d4d4d8' : '#4b5563' }}
                  width={140}
                  tickFormatter={(v) => (v.length > 20 ? `${v.substring(0, 18)}...` : v)}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(128,128,128,0.1)' : 'rgba(229,231,235,0.5)' }} />
                <Bar
                  dataKey={sortBy}
                  fill="url(#top-models-gradient)"
                  barSize={16}
                  radius={[0, 4, 4, 0] as any}
                  background={{ fill: isDark ? '#374151' : '#f3f4f6' }}
                >
                  <LabelList
                    dataKey={sortBy}
                    position="right"
                    formatter={(value: unknown) => {
                        if (typeof value !== 'number') return null;
                        return sortBy === 'units' ? compactNumberFormatter(value) : compactCurrencyFormatter(value);
                    }}
                    style={{ fontSize: 12, fontWeight: '600', fill: isDark ? '#f1f5f9' : '#0f172a' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {viewMode === 'treemap' && <TreemapView data={topModelsData} sortBy={sortBy} />}
          {viewMode === 'table' && <DataTable data={topModelsData} sortBy={sortBy} onRowClick={onModelSelect} />}
        </motion.div>
      </AnimatePresence>
    </ChartCard>
  );
};

export default TopSellingModelsChart;
