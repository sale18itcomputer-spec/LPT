import React from 'react';
import type { LocalFiltersState } from '../../types';
import { GlobeAltIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '../ui/Icons';


interface ProfitReconciliationFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const statusOptions: { label: string; value: LocalFiltersState['profitReconStatus']; icon: React.FC<any> }[] = [
    { label: 'All', value: 'all', icon: GlobeAltIcon },
    { label: 'Matched & Costed', value: 'Matched', icon: ShieldCheckIcon },
    { label: 'Issues', value: 'Issues', icon: ExclamationTriangleIcon },
];

const ProfitReconciliationFilters: React.FC<ProfitReconciliationFiltersProps> = ({ localFilters, setLocalFilters }) => {

  const handleFilterChange = <K extends keyof LocalFiltersState>(key: K, value: LocalFiltersState[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <div>
        <label htmlFor="profit-recon-search" className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Search Serial / MTM / Invoice / SO</label>
        <input
          id="profit-recon-search"
          type="text"
          placeholder="e.g., MJ0C123..."
          value={localFilters.profitReconSearchTerm}
          onChange={(e) => handleFilterChange('profitReconSearchTerm', e.target.value)}
          className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Reconciliation Status</label>
        <div className="flex items-center gap-2 flex-wrap">
            {statusOptions.map(({ label, value, icon: Icon }) => {
                const isActive = localFilters.profitReconStatus === value;
                return (
                    <button
                        key={value}
                        onClick={() => handleFilterChange('profitReconStatus', value)}
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

export default ProfitReconciliationFilters;
