import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LocalFiltersState, OrderDateRangePreset } from '../../types';
import { useData } from '../../contexts/DataContext';
import MultiSelect from '../ui/MultiSelect';
import Select from '../ui/Select';
import { toYYYYMMDD, calculateDatesForPreset, calculateDatesForYearQuarter } from '../../utils/dateHelpers';


interface OrderFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const OrderFilters: React.FC<OrderFiltersProps> = ({ localFilters, setLocalFilters }) => {
  const { orderFilterOptions } = useData();

  const handleFilterChange = useCallback(<K extends keyof LocalFiltersState>(key: K, value: LocalFiltersState[K]) => {
    setLocalFilters(prev => {
        if (JSON.stringify(prev[key]) === JSON.stringify(value)) return prev;
        return { ...prev, [key]: value };
    });
  }, [setLocalFilters]);

  const handlePresetChange = useCallback((preset: OrderDateRangePreset) => {
    setLocalFilters(prev => {
        if (prev.orderDateRangePreset === preset && preset !== 'custom') return prev;
        const { startDate, endDate } = calculateDatesForPreset(preset);
        return {
            ...prev,
            orderDateRangePreset: preset,
            orderStartDate: startDate,
            orderEndDate: endDate,
            orderYear: 'all',
            orderQuarter: 'all',
        };
    });
  }, [setLocalFilters]);

  const handleYearChange = useCallback((year: string) => {
    setLocalFilters(prev => {
        if (prev.orderYear === year) return prev;
        const { startDate, endDate } = calculateDatesForYearQuarter(year, 'all');
        return {
            ...prev,
            orderYear: year,
            orderQuarter: 'all',
            orderDateRangePreset: 'custom',
            orderStartDate: startDate,
            orderEndDate: endDate,
        };
    });
  }, [setLocalFilters]);

  const handleQuarterChange = useCallback((quarter: string) => {
    setLocalFilters(prev => {
        if (prev.orderYear === 'all' && quarter !== 'all') return prev;
        if (prev.orderQuarter === quarter) return prev;
        const { startDate, endDate } = calculateDatesForYearQuarter(prev.orderYear, quarter);
        return {
            ...prev,
            orderQuarter: quarter,
            orderDateRangePreset: 'custom',
            orderStartDate: startDate,
            orderEndDate: endDate,
        };
    });
  }, [setLocalFilters]);

    const handleDateChange = useCallback((key: 'orderStartDate' | 'orderEndDate', value: string | null) => {
        setLocalFilters(prev => {
            if (prev[key] === value) return prev;
            return {
                ...prev,
                [key]: value,
                orderDateRangePreset: 'custom',
                orderYear: 'all',
                orderQuarter: 'all',
            }
        });
    }, [setLocalFilters]);

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
          label="Factory Status (to SGP)"
          options={orderFilterOptions.factoryToSgps}
          selected={localFilters.orderFactoryStatus}
          onChange={(v) => handleFilterChange('orderFactoryStatus', v)}
          placeholder="Filter factory statuses..."
        />
      </div>
      <div>
        <MultiSelect
          label="Local Status (to KH)"
          options={orderFilterOptions.statuses}
          selected={localFilters.orderLocalStatus}
          onChange={(v) => handleFilterChange('orderLocalStatus', v)}
          placeholder="Filter local statuses..."
        />
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
                    <Select label="Year" value={localFilters.orderYear} onChange={handleYearChange} options={orderFilterOptions.years} />
                </div>
                <div className="flex-1">
                    <Select label="Quarter" value={localFilters.orderQuarter} onChange={handleQuarterChange} options={orderFilterOptions.quarters} />
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
