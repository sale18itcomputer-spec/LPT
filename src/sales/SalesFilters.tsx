import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import MultiSelect from '../ui/MultiSelect';
import type { LocalFiltersState, SalesDateRangePreset } from '../../types';
import Select from '../ui/Select';

const toYYYYMMDD = (d: Date): string => {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const calculateDatesForPreset = (preset: SalesDateRangePreset): { startDate: string | null, endDate: string | null } => {
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


interface SalesFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const SalesFilters: React.FC<SalesFiltersProps> = ({ localFilters, setLocalFilters }) => {
  const { availableFilterOptions } = useData();

  const handleFilterChange = <K extends keyof LocalFiltersState>(key: K, value: LocalFiltersState[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handlePresetChange = (preset: SalesDateRangePreset) => {
    const { startDate, endDate } = calculateDatesForPreset(preset);
    setLocalFilters(prev => ({
        ...prev,
        salesDateRangePreset: preset,
        salesStartDate: startDate,
        salesEndDate: endDate,
        salesYear: 'all',
        salesQuarter: 'all',
    }));
  };

  const handleYearChange = (year: string) => {
    const { startDate, endDate } = calculateDatesForYearQuarter(year, 'all');
    setLocalFilters(prev => ({
        ...prev,
        salesYear: year,
        salesQuarter: 'all',
        salesDateRangePreset: 'custom',
        salesStartDate: startDate,
        salesEndDate: endDate,
    }));
  };

  const handleQuarterChange = (quarter: string) => {
    if (localFilters.salesYear === 'all' && quarter !== 'all') return;
    const { startDate, endDate } = calculateDatesForYearQuarter(localFilters.salesYear, quarter);
    setLocalFilters(prev => ({
        ...prev,
        salesQuarter: quarter,
        salesDateRangePreset: 'custom',
        salesStartDate: startDate,
        salesEndDate: endDate,
    }));
  };

  const handleDateChange = (key: 'salesStartDate' | 'salesEndDate', value: string | null) => {
    setLocalFilters(prev => ({
        ...prev,
        [key]: value,
        salesDateRangePreset: 'custom',
        salesYear: 'all',
        salesQuarter: 'all',
    }));
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
          label="Product Line"
          options={availableFilterOptions.orders.productLines}
          selected={localFilters.salesProductLine}
          onChange={v => handleFilterChange('salesProductLine', v)}
          placeholder="Filter product lines..."
        />
      </div>
      <div>
        <MultiSelect
          label="Segment"
          options={availableFilterOptions.sales.segments}
          selected={localFilters.salesSegment}
          onChange={v => handleFilterChange('salesSegment', v)}
          placeholder="Filter segments..."
        />
      </div>
      <div>
        <MultiSelect
          label="Buyer"
          options={availableFilterOptions.sales.buyers}
          selected={localFilters.salesBuyer}
          onChange={v => handleFilterChange('salesBuyer', v)}
          placeholder="Filter buyers..."
        />
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
                    <Select label="Year" value={localFilters.salesYear} onChange={handleYearChange} options={availableFilterOptions.sales.years} />
                </div>
                <div className="flex-1">
                    <Select label="Quarter" value={localFilters.salesQuarter} onChange={handleQuarterChange} options={availableFilterOptions.sales.quarters} />
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
