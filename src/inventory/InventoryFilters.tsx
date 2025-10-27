import React, { useCallback } from 'react';
import type { LocalFiltersState } from '../../types';
import Select from '../ui/Select';
import { GlobeAltIcon, ShieldCheckIcon, FireIcon, ExclamationTriangleIcon, ArchiveBoxIcon } from '../ui/Icons';


interface InventoryFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const filterOptions: { label: string; value: LocalFiltersState['stockStatus']; icon: React.FC<any> }[] = [
    { label: 'All', value: 'all', icon: GlobeAltIcon },
    { label: 'Healthy', value: 'healthy', icon: ShieldCheckIcon },
    { label: 'Low Stock', value: 'lowStock', icon: FireIcon },
    { label: 'Critical', value: 'critical', icon: ExclamationTriangleIcon },
    { label: 'Out of Stock', value: 'outOfStock', icon: ArchiveBoxIcon },
];


const InventoryFilters: React.FC<InventoryFiltersProps> = ({ localFilters, setLocalFilters }) => {
  
  const handleFilterChange = useCallback(<K extends keyof LocalFiltersState>(key: K, value: LocalFiltersState[K]) => {
    setLocalFilters(prev => {
        if (prev[key] === value) return prev;
        return { ...prev, [key]: value };
    });
  }, [setLocalFilters]);

  return (
    <>
      <div>
        <label htmlFor="inventory-search" className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Search MTM / Model</label>
        <input
          id="inventory-search"
          type="text"
          placeholder="e.g., 21JJS00J00 or Yoga Slim..."
          value={localFilters.inventorySearchTerm}
          onChange={(e) => handleFilterChange('inventorySearchTerm', e.target.value)}
          className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
        />
      </div>
       <div>
        <label className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Stock Status</label>
        <div className="flex items-center gap-2 flex-wrap">
            {filterOptions.map(({ label, value, icon: Icon }) => {
                const isActive = localFilters.stockStatus === value;
                return (
                    <button
                        key={value}
                        onClick={() => handleFilterChange('stockStatus', value)}
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

export default InventoryFilters;