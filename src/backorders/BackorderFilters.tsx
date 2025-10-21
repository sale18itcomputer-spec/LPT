import React from 'react';
import type { LocalFiltersState } from '../../types';
import { GlobeAltIcon, BarsArrowUpIcon, MinusIcon, BarsArrowDownIcon } from '../ui/Icons';


interface BackorderFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const priorityOptions: { label: string; value: LocalFiltersState['backorderPriority']; icon: React.FC<any> }[] = [
    { label: 'All', value: 'all', icon: GlobeAltIcon },
    { label: 'High', value: 'High', icon: BarsArrowUpIcon },
    { label: 'Medium', value: 'Medium', icon: MinusIcon },
    { label: 'Low', value: 'Low', icon: BarsArrowDownIcon },
];

const BackorderFilters: React.FC<BackorderFiltersProps> = ({ localFilters, setLocalFilters }) => {

  const handleFilterChange = <K extends keyof LocalFiltersState>(key: K, value: LocalFiltersState[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <div>
        <label htmlFor="backorder-search" className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Search MTM / Model / Product Line</label>
        <input
          id="backorder-search"
          type="text"
          placeholder="e.g., 21JJS00J00 or Yoga Slim..."
          value={localFilters.backorderSearchTerm}
          onChange={(e) => handleFilterChange('backorderSearchTerm', e.target.value)}
          className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
        />
      </div>
       <div>
        <label className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Priority</label>
        <div className="flex items-center gap-2 flex-wrap">
            {priorityOptions.map(({ label, value, icon: Icon }) => {
                const isActive = localFilters.backorderPriority === value;
                return (
                    <button
                        key={value}
                        onClick={() => handleFilterChange('backorderPriority', value)}
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

export default BackorderFilters;