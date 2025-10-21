import React from 'react';
import type { LocalFiltersState } from '../../types';
import { TruckIcon, CheckBadgeIcon, GlobeAltIcon, ExclamationTriangleIcon } from '../ui/Icons';

interface ShipmentFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

type ShipmentStatusType = 'Transit CN > SG' | 'Transit SG > KH' | 'Arrived' | 'Delayed';

const filterOptions: {
    label: string;
    value: ShipmentStatusType;
    icon: React.FC<any>;
}[] = [
    { label: 'Transit CN > SG', value: 'Transit CN > SG', icon: TruckIcon },
    { label: 'Transit SG > KH', value: 'Transit SG > KH', icon: TruckIcon },
    { label: 'Delayed', value: 'Delayed', icon: ExclamationTriangleIcon },
    { label: 'Arrived', value: 'Arrived', icon: CheckBadgeIcon },
];

const ShipmentFilters: React.FC<ShipmentFiltersProps> = ({ localFilters, setLocalFilters }) => {

  const handleFilterChange = <K extends keyof LocalFiltersState>(key: K, value: LocalFiltersState[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const toggleStatusFilter = (status: ShipmentStatusType) => {
      const currentStatuses = localFilters.shipmentStatus;
      const newStatuses = currentStatuses.includes(status)
          ? currentStatuses.filter(s => s !== status)
          : [...currentStatuses, status];
      handleFilterChange('shipmentStatus', newStatuses);
  }

  const isAllActive = localFilters.shipmentStatus.length === 0;

  return (
    <>
      <div>
        <label htmlFor="shipment-search" className="block text-xs text-secondary-text mb-1">Search SO / MTM / Packing List</label>
        <input
          id="shipment-search"
          type="text"
          placeholder="e.g., LSC51600..."
          value={localFilters.shipmentSearchTerm}
          onChange={(e) => handleFilterChange('shipmentSearchTerm', e.target.value)}
          className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-secondary-text mb-1">Shipment Status</label>
        <div className="flex items-center gap-2 flex-wrap">
             <button
                key="all"
                onClick={() => handleFilterChange('shipmentStatus', [])}
                className={`px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 ${
                    isAllActive
                        ? 'bg-highlight text-white shadow-md'
                        : 'bg-secondary-bg dark:bg-dark-secondary-bg text-secondary-text dark:text-dark-secondary-text hover:bg-gray-100 dark:hover:bg-dark-primary-bg hover:text-primary-text dark:hover:text-dark-primary-text border border-border-color dark:border-dark-border-color'
                }`}
                aria-pressed={isAllActive}
            >
                <GlobeAltIcon className={`h-5 w-5 ${isAllActive ? '' : 'text-gray-400'}`} />
                All
            </button>
            {filterOptions.map(({ label, value, icon: Icon }) => {
                const isActive = localFilters.shipmentStatus.includes(value);
                return (
                    <button
                        key={value}
                        onClick={() => toggleStatusFilter(value)}
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

export default ShipmentFilters;