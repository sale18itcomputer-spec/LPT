import React from 'react';
import type { LocalFiltersState, CustomerTier } from '../../types';
import MultiSelect from '../ui/MultiSelect';
import { GlobeAltIcon, FireIcon, UserPlusIcon, UserMinusIcon } from '../ui/Icons';


interface CustomerFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const statusOptions: { label: string; value: LocalFiltersState['customerStatus']; icon: React.FC<any> }[] = [
    { label: 'All', value: 'all', icon: GlobeAltIcon },
    { label: 'Active', value: 'active', icon: FireIcon },
    { label: 'New', value: 'new', icon: UserPlusIcon },
    { label: 'At Risk', value: 'atRisk', icon: UserMinusIcon },
];

const CustomerFilters: React.FC<CustomerFiltersProps> = ({ localFilters, setLocalFilters }) => {

  const handleFilterChange = <K extends keyof LocalFiltersState>(key: K, value: LocalFiltersState[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const TIER_OPTIONS: CustomerTier[] = ['Platinum', 'Gold', 'Silver', 'Bronze'];

  return (
    <>
      <div>
        <label htmlFor="customer-search" className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Search by Customer Name</label>
        <input
          id="customer-search"
          type="text"
          placeholder="e.g., Meta..."
          value={localFilters.customerSearchTerm}
          onChange={(e) => handleFilterChange('customerSearchTerm', e.target.value)}
          className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
        />
      </div>
      <div>
        <MultiSelect
          label="Customer Tier"
          options={TIER_OPTIONS}
          selected={localFilters.customerTier}
          onChange={(v) => handleFilterChange('customerTier', v as CustomerTier[])}
          placeholder="Filter tiers..."
        />
      </div>
      <div>
        <label className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Status</label>
        <div className="flex items-center gap-2 flex-wrap">
            {statusOptions.map(({ label, value, icon: Icon }) => {
                const isActive = localFilters.customerStatus === value;
                return (
                    <button
                        key={value}
                        onClick={() => handleFilterChange('customerStatus', value)}
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
    </>
  );
};

export default CustomerFilters;
