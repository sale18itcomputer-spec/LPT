import React from 'react';
import type { LocalFiltersState } from '../../types';
import Select from '../ui/Select';
import { GlobeAltIcon, CheckCircleIcon, FireIcon, XCircleIcon } from '../ui/Icons';


interface PriceListFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
  productLineOptions: string[];
}

const stockStatusOptions: { label: string; value: LocalFiltersState['priceListStockStatus']; icon: React.FC<any> }[] = [
    { label: 'All', value: 'all', icon: GlobeAltIcon },
    { label: 'In Stock', value: 'inStock', icon: CheckCircleIcon },
    { label: 'Low Stock', value: 'lowStock', icon: FireIcon },
    { label: 'Out of Stock', value: 'outOfStock', icon: XCircleIcon },
];

const PriceListFilters: React.FC<PriceListFiltersProps> = ({ localFilters, setLocalFilters, productLineOptions }) => {
  
  const handleFilterChange = <K extends keyof LocalFiltersState>(key: K, value: LocalFiltersState[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <div>
        <label htmlFor="pricelist-search" className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Search MTM / Model / SO / Color</label>
        <input
          id="pricelist-search"
          type="text"
          placeholder="e.g., 21JJS00J00 or Yoga Slim..."
          value={localFilters.priceListSearchTerm}
          onChange={(e) => handleFilterChange('priceListSearchTerm', e.target.value)}
          className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
        />
      </div>
      <div>
         <Select
            label="Product Line"
            value={localFilters.priceListProductLine}
            onChange={(v) => handleFilterChange('priceListProductLine', v)}
            options={productLineOptions}
        />
      </div>
       <div>
        <label className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Stock Status</label>
        <div className="flex items-center gap-2 flex-wrap">
            {stockStatusOptions.map(({ label, value, icon: Icon }) => {
                const isActive = localFilters.priceListStockStatus === value;
                return (
                    <button
                        key={value}
                        onClick={() => handleFilterChange('priceListStockStatus', value)}
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

export default PriceListFilters;
