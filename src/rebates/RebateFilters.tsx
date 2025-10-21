import React, { useMemo } from 'react';
import type { LocalFiltersState, RebateProgram } from '../../types';
import Select from '../ui/Select';
import { GlobeAltIcon, CheckCircleIcon, XCircleIcon } from '../ui/Icons';
import { useData } from '../../contexts/DataContext';

interface RebateFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const statusOptions: { label: string; value: 'all' | RebateProgram['status']; icon: React.FC<any> }[] = [
    { label: 'All', value: 'all', icon: GlobeAltIcon },
    { label: 'Open', value: 'Open', icon: CheckCircleIcon },
    { label: 'Closed', value: 'Close', icon: XCircleIcon },
];

const RebateFilters: React.FC<RebateFiltersProps> = ({ localFilters, setLocalFilters }) => {
  const { allRebates } = useData();

  const handleFilterChange = <K extends keyof LocalFiltersState>(key: K, value: LocalFiltersState[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const updateStatusOptions = useMemo(() => {
      return [...new Set(allRebates.map(r => r.update))].sort();
  }, [allRebates]);

  return (
    <>
      <div>
        <label htmlFor="rebate-search" className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Search Program / Quarter / Credit No.</label>
        <input
          id="rebate-search"
          type="text"
          placeholder="e.g., Q4 SMB Focus..."
          value={localFilters.rebateSearchTerm}
          onChange={(e) => handleFilterChange('rebateSearchTerm', e.target.value)}
          className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
        />
      </div>
      <div>
        <Select
            label="Update Status"
            value={localFilters.rebateUpdateStatus}
            onChange={(v) => handleFilterChange('rebateUpdateStatus', v)}
            options={updateStatusOptions}
        />
      </div>
      <div>
        <label className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Program Status</label>
        <div className="flex items-center gap-2 flex-wrap">
            {statusOptions.map(({ label, value, icon: Icon }) => {
                const isActive = localFilters.rebateStatus === value;
                return (
                    <button
                        key={value}
                        onClick={() => handleFilterChange('rebateStatus', value)}
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

export default RebateFilters;
