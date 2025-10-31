
import React, { useMemo, useState, useContext, useId } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, Treemap } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import type { Sale } from '../../types';
import ChartCard from '../ui/ChartCard';
import SegmentedControl from '../ui/SegmentedControl';
import { getISOWeek } from '../../utils/dateHelpers';
import { ThemeContext } from '../../contexts/ThemeContext';
import { DocumentMagnifyingGlassIcon, ChartBarIcon, TableCellsIcon, ClipboardDocumentListIcon } from '../ui/Icons';

interface PeriodData {
  period: string;
  name: string; // for recharts
  revenue: number;
  growth: number | null;
  sortKey: string;
  [key: string]: any; // FIX: Add index signature for Recharts Treemap compatibility
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
const SalesBreakdownByPeriod: React.FC<{ sales: Sale[] }> = ({ sales }) => {
  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [viewMode, setViewMode] = useState<ViewMode>('bar');
  const themeContext = useContext(ThemeContext);
  const isDark = themeContext?.theme === 'dark';

  const periodData = useMemo((): PeriodData[] => {
    const dataByPeriod: Record<string, { revenue: number; sortKey: string }> = {};

    sales.forEach((sale) => {
      if (!sale.invoiceDate) return;
      const date = new Date(sale.invoiceDate);
      let key = '';
      let sortKey = '';

      switch (periodType) {
        case 'quarterly':
          const qYear = date.getUTCFullYear();
          const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
          key = `Q${quarter}, ${qYear}`;
          sortKey = `${qYear}-Q${quarter}`;
          break;
        case 'monthly':
          const mYear = date.getUTCFullYear();
          const month = date.getUTCMonth();
          key = `${date.toLocaleString('en-US', { timeZone: 'UTC', month: 'short' })}, ${mYear}`;
          sortKey = `${mYear}-${String(month + 1).padStart(2, '0')}`;
          break;
        case 'weekly':
          const wYear = date.getUTCFullYear();
          const week = getISOWeek(date);
          key = `W${week}, ${wYear}`;
          sortKey = `${wYear}-${String(week).padStart(2, '0')}`;
          break;
        case 'daily':
          key = date.toLocaleDateString('en-CA', { timeZone: 'UTC' });
          sortKey = key;
          break;
      }

      if (!dataByPeriod[key]) dataByPeriod[key] = { revenue: 0, sortKey };
      dataByPeriod[key].revenue += sale.totalRevenue;
    });

    const limit = periodType === 'quarterly' ? 8 : periodType === 'monthly' ? 12 : periodType === 'weekly' ? 16 : 30;

    const sorted = Object.entries(dataByPeriod)
      .map(([period, { revenue, sortKey }]) => ({ period, revenue, sortKey }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey)) // Chronological
      .slice(-limit); // Most recent

    return sorted.map((current, i, arr) => {
      const prev = arr[i - 1];
      const growth = prev && prev.revenue > 0 ? ((current.revenue - prev.revenue) / prev.revenue) * 100 : null;
      return { ...current, name: current.period, growth };
    });
  }, [sales, periodType]);

  if (periodData.length === 0) {
    return (
      <ChartCard title="Sales Breakdown by Period" description="Select period type" className="h-[450px]">
        <div className="flex flex-col items-center justify-center h-full text-secondary-text p-4 text-center">
          <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
          <p className="text-sm">No sales data in the selected period.</p>
        </div>
      </ChartCard>
    );
  }

  const controls = (
    <>
      <SegmentedControl
        value={periodType}
        onChange={(v) => setPeriodType(v as PeriodType)}
        options={[
          { label: 'Daily', value: 'daily' },
          { label: 'Weekly', value: 'weekly' },
          { label: 'Monthly', value: 'monthly' },
          { label: 'Quarterly', value: 'quarterly' },
        ]}
        label="Select period type"
      />
      <ViewModeSwitcher viewMode={viewMode} setViewMode={setViewMode} />
    </>
  );

  return (
    <ChartCard
      title="Sales Breakdown by Period"
      description={`${periodType.charAt(0).toUpperCase() + periodType.slice(1)} revenue`}
      controls={controls}
      className="flex flex-col h-[560px]"
    >
      <div aria-live="polite" className="sr-only">
        Viewing {viewMode} of sales by {periodType}.
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
              <BarChart data={periodData} layout="vertical" margin={{ top: 5, right: 80, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="breakdown-bar-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={isDark ? '#3b82f6' : '#60a5fa'} />
                    <stop offset="100%" stopColor={isDark ? '#1d4ed8' : '#2563eb'} />
                  </linearGradient>
                </defs>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="period"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: isDark ? '#d4d4d8' : '#4b5563' }}
                  width={140}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(128,128,128,0.1)' : 'rgba(229,231,235,0.5)' }} />
                <Bar
                  dataKey="revenue"
                  fill="url(#breakdown-bar-gradient)"
                  barSize={16}
                  radius={[0, 4, 4, 0] as any}
                  background={{ fill: isDark ? '#374151' : '#f3f4f6' }}
                >
                  <LabelList
                    dataKey="revenue"
                    position="right"
                    formatter={(value: unknown) => {
                        if (typeof value === 'number') {
                            return compactCurrency(value);
                        }
                        return null;
                    }}
                    style={{ fontSize: 12, fontWeight: '600', fill: isDark ? '#f1f5f9' : '#0f172a' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {viewMode === 'treemap' && <TreemapView data={periodData} />}
          {viewMode === 'table' && <DataTable data={periodData} />}
        </motion.div>
      </AnimatePresence>
    </ChartCard>
  );
};

export default SalesBreakdownByPeriod;
