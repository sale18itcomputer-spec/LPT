import React, { useCallback } from 'react';
import type { LocalFiltersState } from '../../types';
import {
  GlobeAltIcon,
  ShieldCheckIcon,
  FireIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  TruckIcon,
  ArrowDownCircleIcon,
} from '../ui/Icons';
import { useToast } from '../../contexts/ToastContext';

interface InventoryFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const filterOptions: {
  label: string;
  value: LocalFiltersState['stockStatus'];
  icon: React.FC<any>;
  tooltip: string;
}[] = [
  { label: 'All Stock', value: 'all', icon: GlobeAltIcon, tooltip: 'Show all inventory items' },
  { label: 'Healthy', value: 'healthy', icon: ShieldCheckIcon, tooltip: 'Items with >12 weeks of inventory' },
  { label: 'Low Stock', value: 'lowStock', icon: FireIcon, tooltip: 'Items with 4-12 weeks of inventory' },
  { label: 'Critical', value: 'critical', icon: ExclamationTriangleIcon, tooltip: 'Items with <4 weeks of inventory' },
  { label: 'Out of Stock', value: 'outOfStock', icon: ArchiveBoxIcon, tooltip: 'Items with zero or negative stock' },
  { label: 'On The Way', value: 'otw', icon: TruckIcon, tooltip: 'Items with incoming stock' },
  { label: 'Oversold', value: 'oversold', icon: ArrowDownCircleIcon, tooltip: 'Items with negative on-hand quantity' },
];

const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  localFilters,
  setLocalFilters,
}) => {
  const { showToast } = useToast();

  const handleFilterChange = useCallback(
    (key: keyof LocalFiltersState, value: LocalFiltersState[keyof LocalFiltersState]) => {
      setLocalFilters((prev) => {
        if (prev[key] === value) return prev;
        const newFilters = { ...prev, [key]: value };
        if (key === 'stockStatus') {
          showToast(`Applied filter: ${filterOptions.find(opt => opt.value === value)?.label || 'All'}`, 'success');
        }
        return newFilters;
      });
    },
    [setLocalFilters, showToast]
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4 transition-all duration-300">
      {/* Search Bar */}
      <div>
        <label
          htmlFor="inventory-search"
          className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 tracking-wide"
        >
          Search MTM / Model
        </label>
        <div className="relative">
          <input
            id="inventory-search"
            type="text"
            placeholder="e.g., 21JJS00J00 or Yoga Slim..."
            value={localFilters.inventorySearchTerm}
            onChange={(e) => handleFilterChange('inventorySearchTerm', e.target.value)}
            className="block w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 pl-4 pr-10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            aria-label="Search inventory by MTM or model name"
            aria-describedby="search-help"
          />
          <span className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" aria-hidden="true">
            ⌕
          </span>
          <p id="search-help" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Search by MTM code or model name.
          </p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div>
        <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 tracking-wide">
          Stock Status
        </label>
        <div className="flex items-center flex-wrap gap-2" role="group" aria-label="Inventory stock status filters">
          {filterOptions.map(({ label, value, icon: Icon, tooltip }) => {
            const isActive = localFilters.stockStatus === value;
            return (
              <button
                key={value}
                onClick={() => handleFilterChange('stockStatus', value)}
                className={`px-3 py-2 text-sm font-medium rounded-xl flex items-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 
                  ${isActive
                    ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-md scale-[1.02]'
                    : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-emerald-600'
                  }`}
                aria-pressed={isActive}
                title={tooltip}
              >
                <Icon
                  className={`h-5 w-5 transition-colors duration-200 ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-emerald-600'}`}
                />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InventoryFilters;