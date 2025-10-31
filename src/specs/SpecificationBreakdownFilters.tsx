import React, { useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { LocalFiltersState } from '../../types';
import { getISOWeek } from '../../utils/dateHelpers';
import SegmentedControl from '../ui/SegmentedControl';
import MultiSelect from '../ui/MultiSelect';

interface SpecFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const SpecificationBreakdownFilters: React.FC<SpecFiltersProps> = ({ localFilters, setLocalFilters }) => {
  const { allSales, inventoryData } = useData();

  const { availableYears, availableWeeks, cpuOptions, mtmOptions } = useMemo(() => {
    const years = new Set(allSales.map(s => s.invoiceDate ? new Date(s.invoiceDate).getUTCFullYear() : null));
    const yearOptions = Array.from(years).filter((y): y is number => y !== null).sort((a, b) => b - a);

    const weeks = new Set<number>();
    allSales.forEach(s => {
        if (s.invoiceDate) {
            const d = new Date(s.invoiceDate);
            if (d.getUTCFullYear() === localFilters.cpuSalesYear) {
                weeks.add(getISOWeek(d));
            }
        }
    });
    const weekArray = Array.from(weeks);
    const weekBounds = {
        min: weekArray.length > 0 ? Math.min(...weekArray) : 1,
        max: weekArray.length > 0 ? Math.max(...weekArray) : 52,
    };

    const cpus = new Set<string>();
    const mtms = new Set<string>();
    const allItems = [...allSales, ...inventoryData];
    allItems.forEach(item => {
        if ('lenovoProductNumber' in item) mtms.add(item.lenovoProductNumber);
        if ('mtm' in item) mtms.add(item.mtm);
        if (item.parsedSpecification?.cpuFamily) cpus.add(item.parsedSpecification.cpuFamily);
    });
    const cpuOptions = Array.from(cpus).sort();
    const mtmOptions = Array.from(mtms).sort();

    return { availableYears: yearOptions, availableWeeks: weekBounds, cpuOptions, mtmOptions };
  }, [allSales, inventoryData, localFilters.cpuSalesYear]);

  const handleFilterChange = useCallback((key: keyof LocalFiltersState, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  }, [setLocalFilters]);

  return (
    <>
        <div className="flex flex-col gap-1">
            <label htmlFor="year-selector-spec" className="text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Year</label>
            <select 
                id="year-selector-spec" 
                value={localFilters.cpuSalesYear} 
                onChange={(e) => handleFilterChange('cpuSalesYear', Number(e.target.value))} 
                className="bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-2 px-3 text-primary-text dark:text-dark-primary-text text-sm focus:ring-highlight focus:border-highlight focus:outline-none"
            >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>
        <div>
            <label className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Week Range</label>
            <div className="flex items-center gap-2">
                <select
                    id="start-week-selector"
                    value={localFilters.cpuSalesStartWeek}
                    onChange={(e) => handleFilterChange('cpuSalesStartWeek', Number(e.target.value))}
                    className="w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-2 px-3 text-primary-text dark:text-dark-primary-text text-sm focus:ring-highlight focus:border-highlight focus:outline-none"
                    aria-label="Start Week"
                >
                    {Array.from({ length: localFilters.cpuSalesEndWeek - availableWeeks.min + 1 }, (_, i) => i + availableWeeks.min).map(week => (
                        <option key={week} value={week}>Wk {week}</option>
                    ))}
                </select>
                <span className="text-secondary-text dark:text-dark-secondary-text">-</span>
                <select
                    id="end-week-selector"
                    value={localFilters.cpuSalesEndWeek}
                    onChange={(e) => handleFilterChange('cpuSalesEndWeek', Number(e.target.value))}
                    className="w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-2 px-3 text-primary-text dark:text-dark-primary-text text-sm focus:ring-highlight focus:border-highlight focus:outline-none"
                    aria-label="End Week"
                >
                    {Array.from({ length: availableWeeks.max - localFilters.cpuSalesStartWeek + 1 }, (_, i) => i + localFilters.cpuSalesStartWeek).map(week => (
                        <option key={week} value={week}>Wk {week}</option>
                    ))}
                </select>
            </div>
        </div>
        <div>
            <label className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Filter by MTM Prefix</label>
            <SegmentedControl
                label="MTM Prefix"
                value={localFilters.cpuSalesMtmPrefix}
                onChange={v => handleFilterChange('cpuSalesMtmPrefix', v as string)}
                options={[
                    { label: 'All', value: 'all' },
                    { label: '83', value: '83' },
                    { label: 'F0H', value: 'F0H' },
                ]}
            />
        </div>
        <div>
            <MultiSelect
                label="Filter by CPU"
                options={cpuOptions}
                selected={localFilters.cpuSalesCpuFilter}
                onChange={v => handleFilterChange('cpuSalesCpuFilter', v)}
                placeholder="All CPUs"
            />
        </div>
        <div>
            <MultiSelect
                label="Filter by MTM"
                options={mtmOptions}
                selected={localFilters.cpuSalesMtmFilter}
                onChange={v => handleFilterChange('cpuSalesMtmFilter', v)}
                placeholder="All MTMs"
            />
        </div>
    </>
  );
};

export default SpecificationBreakdownFilters;