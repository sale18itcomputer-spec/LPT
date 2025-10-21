

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LocalFiltersState, OrderDateRangePreset } from '../../types';
import { useData } from '../../contexts/DataContext';
import MultiSelect from '../ui/MultiSelect';
import Select from '../ui/Select';
import { GlobeAltIcon, ExclamationTriangleIcon, ClockIcon, CheckBadgeIcon } from '../ui/Icons';


const toYYYYMMDD = (d: Date): string => {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const calculateDatesForPreset = (preset: OrderDateRangePreset): { startDate: string | null, endDate: string | null } => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();

    let startDate: Date;
    let endDate: Date = new Date(Date.UTC(y, m, d));

    if (preset === 'all' || preset === 'custom') {
        return { startDate: null, endDate: null };
    }

    switch (preset) {
        case 'last30':
            startDate = new Date(Date.UTC(y, m, d));
            startDate.setUTCDate(startDate.getUTCDate() - 29);
            break;
        case 'last90':
            startDate = new Date(Date.UTC(y, m, d));
            startDate.setUTCDate(startDate.getUTCDate() - 89);
            break;
        case 'thisMonth':
            startDate = new Date(Date.UTC(y, m, 1));
            break;
        case 'lastMonth':
            startDate = new Date(Date.UTC(y, m - 1, 1));
            endDate = new Date(Date.UTC(y, m, 0));
            break;
        case 'thisQuarter':
            const q = Math.floor(m / 3);
            startDate = new Date(Date.UTC(y, q * 3, 1));
            break;
        case 'lastQuarter':
            const currentQuarter = Math.floor(m / 3);
            const lastQuarterYear = currentQuarter === 0 ? y - 1 : y;
            const lastQuarterStartMonth = currentQuarter === 0 ? 9 : (currentQuarter - 1) * 3;
            startDate = new Date(Date.UTC(lastQuarterYear, lastQuarterStartMonth, 1));
            endDate = new Date(Date.UTC(lastQuarterYear, lastQuarterStartMonth + 3, 0));
            break;
        case 'thisYear':
        default:
            startDate = new Date(Date.UTC(y, 0, 1));
            break;
    }

    return {
        startDate: toYYYYMMDD(startDate),
        endDate: toYYYYMMDD(endDate),
    };
};

const calculateDatesForYearQuarter = (year: string, quarter: string): { startDate: string | null, endDate: string | null } => {
    if (year === 'all') {
        return { startDate: null, endDate: null };
    }
    const startYear = parseInt(year, 10);
    if (quarter !== 'all') {
        const qNum = parseInt(quarter.replace('Q', ''));
        const startMonth = (qNum - 1) * 3;
        const startDate = new Date(Date.UTC(startYear, startMonth, 1));
        const endDate = new Date(Date.UTC(startYear, startMonth + 3, 0));
        return { startDate: toYYYYMMDD(startDate), endDate: toYYYYMMDD(endDate) };
    } else { // just year
        const startDate = new Date(Date.UTC(startYear, 0, 1));
        const endDate = new Date(Date.UTC(startYear, 11, 31));
        return { startDate: toYYYYMMDD(startDate), endDate: toYYYYMMDD(endDate) };
    }
};

interface OrderFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const showOptions: { label: string; value: LocalFiltersState['orderShow']; icon: React.FC<any> }[] = [
    { label: 'All', value: 'all', icon: GlobeAltIcon },
    { label: 'Overdue', value: 'overdue', icon: ExclamationTriangleIcon },
    { label: 'At Risk', value: 'atRisk', icon: ClockIcon },
    { label: 'On Schedule', value: 'onSchedule', icon: CheckBadgeIcon },
];


const OrderFilters: React.FC<OrderFiltersProps> = ({ localFilters, setLocalFilters }) => {
  const { availableFilterOptions } = useData();

  const handleFilterChange = <K extends keyof LocalFiltersState>(key: K, value: LocalFiltersState[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePresetChange = (preset: OrderDateRangePreset) => {
    const { startDate, endDate } = calculateDatesForPreset(preset);
    setLocalFilters(prev => ({
        ...prev,
        orderDateRangePreset: preset,
        orderStartDate: startDate,
        orderEndDate: endDate,
        orderYear: 'all',
        orderQuarter: 'all',
    }));
  };

  const handleYearChange = (year: string) => {
    const { startDate, endDate } = calculateDatesForYearQuarter(year, 'all');
    setLocalFilters(prev => ({
        ...prev,
        orderYear: year,
        orderQuarter: 'all',
        orderDateRangePreset: 'custom',
        orderStartDate: startDate,
        orderEndDate: endDate,
    }));
  };

  const handleQuarterChange = (quarter: string) => {
    if (localFilters.orderYear === 'all' && quarter !== 'all') return;
    const { startDate, endDate } = calculateDatesForYearQuarter(localFilters.orderYear, quarter);
    setLocalFilters(prev => ({
        ...prev,
        orderQuarter: quarter,
        orderDateRangePreset: 'custom',
        orderStartDate: startDate,
        orderEndDate: endDate,
    }));
  };

    const handleDateChange = (key: 'orderStartDate' | 'orderEndDate', value: string | null) => {
        setLocalFilters(prev => ({
            ...prev,
            [key]: value,
            orderDateRangePreset: 'custom',
            orderYear: 'all',
            orderQuarter: 'all',
        }));
    };

    const datePresets: { label: string; value: OrderDateRangePreset }[] = [
        { label: 'Last 30D', value: 'last30' },
        { label: 'Last 90D', value: 'last90' },
        { label: 'This Month', value: 'thisMonth' },
        { label: 'This Qtr', value: 'thisQuarter' },
        { label: 'This Year', value: 'thisYear' },
        { label: 'All', value: 'all' },
        { label: 'Custom', value: 'custom' },
    ];


  return (
    <>
      <div>
        <label htmlFor="order-search" className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Search SO / MTM / Model</label>
        <input
          id="order-search"
          type="text"
          placeholder="e.g., LSC51600, 82YQ0000US..."
          value={localFilters.orderSearchTerm}
          onChange={(e) => handleFilterChange('orderSearchTerm', e.target.value)}
          className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
        />
      </div>
      <div>
        <MultiSelect
          label="Product Line"
          options={availableFilterOptions.orders.productLines}
          selected={localFilters.orderProductLine}
          onChange={(v) => handleFilterChange('orderProductLine', v)}
          placeholder="Filter product lines..."
        />
      </div>
      <div>
        <MultiSelect
          label="Factory Status (to SGP)"
          options={availableFilterOptions.orders.factoryToSgps}
          selected={localFilters.orderFactoryStatus}
          onChange={(v) => handleFilterChange('orderFactoryStatus', v)}
          placeholder="Filter factory statuses..."
        />
      </div>
      <div>
        <MultiSelect
          label="Local Status (to KH)"
          options={availableFilterOptions.orders.statuses}
          selected={localFilters.orderLocalStatus}
          onChange={(v) => handleFilterChange('orderLocalStatus', v)}
          placeholder="Filter local statuses..."
        />
      </div>
      <div>
        <label className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Show</label>
        <div className="flex items-center gap-2 flex-wrap">
            {showOptions.map(({ label, value, icon: Icon }) => {
                const isActive = localFilters.orderShow === value;
                return (
                    <button
                        key={value}
                        onClick={() => handleFilterChange('orderShow', value)}
                        className={`px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 ${
                            isActive
                                ? 'bg-highlight text-white shadow-md'
                                : 'bg-secondary-bg dark:bg-dark-secondary-bg text-secondary-text dark:text-dark-secondary-text hover:bg-gray-100 dark:hover:bg-dark-primary-bg hover:text-primary-text dark:hover:text-dark-primary-text border border-border-color dark:border-dark-border-color'
                        }`}
                        aria-pressed={isActive}
                    >
                        <Icon className={`h-5 w-5 ${isActive ? '' : 'text-gray-400'}`} />
                        {label}
                    </button>
                );
            })}
        </div>
      </div>
       <div className="w-full border-t border-border-color dark:border-dark-border-color mt-3 pt-4">
        <label className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-2">Time Filters (by Order Receipt Date)</label>
        <div className="flex flex-col gap-4">
            <div className="p-1 bg-gray-100 dark:bg-dark-secondary-bg/30 rounded-lg">
                <div className="grid grid-cols-2 gap-1">
                    {datePresets.map(({ label, value }, index) => (
                        <button
                            key={value}
                            onClick={() => handlePresetChange(value)}
                            className={`px-2 py-1.5 text-sm rounded-md transition-colors font-medium ${
                                datePresets.length % 2 !== 0 && index === datePresets.length - 1 ? 'col-span-2' : ''
                            } ${
                                localFilters.orderDateRangePreset === value
                                    ? 'bg-highlight text-white shadow-sm'
                                    : 'text-primary-text dark:text-dark-primary-text hover:bg-secondary-bg/80 dark:hover:bg-dark-secondary-bg/80'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex gap-4">
                <div className="flex-1">
                    <Select label="Year" value={localFilters.orderYear} onChange={handleYearChange} options={availableFilterOptions.orders.years} />
                </div>
                <div className="flex-1">
                    <Select label="Quarter" value={localFilters.orderQuarter} onChange={handleQuarterChange} options={availableFilterOptions.orders.quarters} />
                </div>
            </div>
            <AnimatePresence>
                {localFilters.orderDateRangePreset === 'custom' && (
                    <motion.div
                        className="flex flex-col gap-4"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                    >
                        <div>
                            <label htmlFor="order-start-date" className="block text-xs text-secondary-text mb-1">Start Date</label>
                            <input id="order-start-date" type="date" value={localFilters.orderStartDate || ''} onChange={e => handleDateChange('orderStartDate', e.target.value || null)} max={localFilters.orderEndDate || ''} className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-2 px-3 text-primary-text dark:text-dark-primary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="order-end-date" className="block text-xs text-secondary-text mb-1">End Date</label>
                            <input id="order-end-date" type="date" value={localFilters.orderEndDate || ''} onChange={e => handleDateChange('orderEndDate', e.target.value || null)} min={localFilters.orderStartDate || ''} className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-2 px-3 text-primary-text dark:text-dark-primary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default OrderFilters;
