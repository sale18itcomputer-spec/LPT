import React, { useCallback } from 'react';
import type { LocalFiltersState, CustomerTier } from '../../types';
import MultiSelect from '../ui/MultiSelect';

interface StrategicFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const StrategicFilters: React.FC<StrategicFiltersProps> = ({ localFilters, setLocalFilters }) => {

  const handleFilterChange = useCallback(<K extends keyof LocalFiltersState>(key: K, value: LocalFiltersState[K]) => {
    setLocalFilters(prev => {
        if (JSON.stringify(prev[key]) === JSON.stringify(value)) return prev;
        return { ...prev, [key]: value };
    });
  }, [setLocalFilters]);

  const TIER_OPTIONS: CustomerTier[] = ['Platinum', 'Gold', 'Silver', 'Bronze'];

  return (
    <>
      <div className="flex-grow min-w-[200px] sm:w-64">
        <label htmlFor="strategic-search" className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Search by Customer Name</label>
        <input
          id="strategic-search"
          type="text"
          placeholder="e.g., Meta..."
          value={localFilters.strategicSearchTerm}
          onChange={(e) => handleFilterChange('strategicSearchTerm', e.target.value)}
          className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
        />
      </div>
      <div className="flex-grow min-w-[150px] sm:w-48">
        <MultiSelect
          label="Customer Tier"
          options={TIER_OPTIONS}
          selected={localFilters.strategicCustomerTier}
          onChange={(v) => handleFilterChange('strategicCustomerTier', v as CustomerTier[])}
          placeholder="Filter tiers..."
        />
      </div>
    </>
  );
};

export default StrategicFilters;