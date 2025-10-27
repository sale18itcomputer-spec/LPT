import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import MultiSelect from '../ui/MultiSelect';
import type { LocalFiltersState, SalesDateRangePreset } from '../../types';
import Select from '../ui/Select';
import { SparklesIcon } from '../ui/Icons';
import { Spinner } from '../ui/Spinner';
import { toYYYYMMDD, calculateDatesForPreset, calculateDatesForYearQuarter } from '../../utils/dateHelpers';


interface SalesFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
  onBuyerRegionSearch: (region: string) => void;
  isBuyerRegionLoading: boolean;
}

const SalesFilters: React.FC<SalesFiltersProps> = ({ localFilters, setLocalFilters, onBuyerRegionSearch, isBuyerRegionLoading }) => {
  const { salesFilterOptions } = useData();
  const [regionQuery, setRegionQuery] = useState(localFilters.salesBuyerRegion);

  const handleFilterChange = useCallback(<K extends keyof LocalFiltersState>(key: K, value: LocalFiltersState[K]) => {
    setLocalFilters(prev => {
        if (JSON.stringify(prev[key]) === JSON.stringify(value)) return prev;
        return { ...prev, [key]: value };
    });
  }, [setLocalFilters]);
  
  const handlePresetChange = useCallback((preset: SalesDateRangePreset) => {
    setLocalFilters(prev => {
        if (prev.salesDateRangePreset === preset && preset !== 'custom') return prev;
        const { startDate, endDate } = calculateDatesForPreset(preset);
        return {
            ...prev,
            salesDateRangePreset: preset,
            salesStartDate: startDate,
            salesEndDate: endDate,
            salesYear: 'all',
            salesQuarter: 'all',
        };
    });
  }, [setLocalFilters]);

  const handleYearChange = useCallback((year: string) => {
    setLocalFilters(prev => {
        if (prev.salesYear === year) return prev;
        const { startDate, endDate } = calculateDatesForYearQuarter(year, 'all');
        return {
            ...prev,
            salesYear: year,
            salesQuarter: 'all',
            salesDateRangePreset: 'custom',
            salesStartDate: startDate,
            salesEndDate: endDate,
        };
    });
  }, [setLocalFilters]);

  const handleQuarterChange = useCallback((quarter: string) => {
    setLocalFilters(prev => {
        if (prev.salesYear === 'all' && quarter !== 'all') return prev;
        if (prev.salesQuarter === quarter) return prev;
        const { startDate, endDate } = calculateDatesForYearQuarter(prev.salesYear, quarter);
        return {
            ...prev,
            salesQuarter: quarter,
            salesDateRangePreset: 'custom',
            salesStartDate: startDate,
            salesEndDate: endDate,
        };
    });
  }, [setLocalFilters]);

  const handleDateChange = useCallback((key: 'salesStartDate' | 'salesEndDate', value: string | null) => {
    setLocalFilters(prev => {
        if (prev[key] === value) return prev;
        return {
            ...prev,
            [key]: value,
            salesDateRangePreset: 'custom',
            salesYear: 'all',
            salesQuarter: 'all',
        };
    });
  }, [setLocalFilters]);
  
  // Syncs the local region input state when the global filter is cleared
  useEffect(() => {
    if (localFilters.salesBuyerRegion === '' && regionQuery !== '') {
        setRegionQuery('');
    }
  }, [localFilters.salesBuyerRegion, regionQuery]);

  // Debounced effect to trigger the AI search
  useEffect(() => {
    // If the user's input is the same as what's already filtered, do nothing.
    // This is the critical guard that prevents the infinite loop.
    if (regionQuery === localFilters.salesBuyerRegion) {
        return;
    }
    const handler = setTimeout(() => {
        onBuyerRegionSearch(regionQuery);
    }, 800);

    return () => clearTimeout(handler);
  }, [regionQuery, localFilters.salesBuyerRegion, onBuyerRegionSearch]);

  const handleRegionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setRegionQuery(newQuery);
  };

  const datePresets: { label: string; value: SalesDateRangePreset }[] = [
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
        <label htmlFor="sales-search" className="block text-xs text-secondary-text mb-1">Search Invoice / MTM / Buyer / Serial</label>
        <input
          id="sales-search"
          type="text"
          placeholder="e.g., INV-1234, 82YQ0000US..."
          value={localFilters.salesSearchTerm}
          onChange={e => handleFilterChange('salesSearchTerm', e.target.value)}
          className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
        />
      </div>
      <div>
        <MultiSelect
          label="Segment"
          options={salesFilterOptions.segments}
          selected={localFilters.salesSegment}
          onChange={v => handleFilterChange('salesSegment', v)}
          placeholder="Filter segments..."
        />
      </div>
       <div>
        <label htmlFor="buyer-region-search" className="block text-xs text-secondary-text mb-1">Filter Buyers by Region (AI)</label>
        <div className="relative">
          <SparklesIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-highlight" />
          <input
            id="buyer-region-search"
            type="text"
            placeholder="e.g., Phnom Penh, Banteay Meanchey..."
            value={regionQuery}
            onChange={handleRegionChange}
            className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 pl-9 pr-8 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
          />
          {isBuyerRegionLoading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Spinner size="sm" />
            </div>
          )}
        </div>
      </div>
      <div>
        <MultiSelect
          label="Buyer"
          options={salesFilterOptions.buyers}
          selected={localFilters.salesBuyer}
          onChange={v => handleFilterChange('salesBuyer', v)}
          placeholder="Filter buyers..."
          disabledOptions={localFilters.salesBuyerRegion ? salesFilterOptions.buyers : []}
        />
      </div>
      <div>
        <label className="block text-xs text-secondary-text mb-1">Filter by Invoice Revenue</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={localFilters.salesRevenueMin ?? ''}
            onChange={e => handleFilterChange('salesRevenueMin', e.target.value ? Number(e.target.value) : null)}
            className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
          />
          <span className="text-secondary-text dark:text-dark-secondary-text">-</span>
          <input
            type="number"
            placeholder="Max"
            value={localFilters.salesRevenueMax ?? ''}
            onChange={e => handleFilterChange('salesRevenueMax', e.target.value ? Number(e.target.value) : null)}
            className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
          />
        </div>
      </div>
      
      <div className="w-full border-t border-border-color dark:border-dark-border-color mt-3 pt-4">
        <label className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-2">Time Filters</label>
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
                                localFilters.salesDateRangePreset === value
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
                    <Select label="Year" value={localFilters.salesYear} onChange={handleYearChange} options={salesFilterOptions.years} />
                </div>
                <div className="flex-1">
                    <Select label="Quarter" value={localFilters.salesQuarter} onChange={handleQuarterChange} options={salesFilterOptions.quarters} />
                </div>
            </div>
            <AnimatePresence>
                {localFilters.salesDateRangePreset === 'custom' && (
                    <motion.div 
                        className="flex flex-col gap-4"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                    >
                        <div>
                            <label htmlFor="sales-start-date" className="block text-xs text-secondary-text mb-1">Start Date</label>
                            <input id="sales-start-date" type="date" value={localFilters.salesStartDate || ''} onChange={e => handleDateChange('salesStartDate', e.target.value || null)} max={localFilters.salesEndDate || ''} className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-2 px-3 text-primary-text dark:text-dark-primary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="sales-end-date" className="block text-xs text-secondary-text mb-1">End Date</label>
                            <input id="sales-end-date" type="date" value={localFilters.salesEndDate || ''} onChange={e => handleDateChange('salesEndDate', e.target.value || null)} min={localFilters.salesStartDate || ''} className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-2 px-3 text-primary-text dark:text-dark-primary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default SalesFilters;