
import React from 'react';
import { FilterIcon } from './Icons';

interface FilterSidebarProps {
  children: React.ReactNode;
  onClear: () => void;
  hasActiveFilters: boolean;
  viewName: string;
  actionsContent?: React.ReactNode;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ children, onClear, hasActiveFilters, viewName, actionsContent }) => {
  return (
    <aside
      className="fixed top-20 left-0 h-[calc(100vh-80px)] w-72 bg-secondary-bg/95 dark:bg-dark-secondary-bg/95 backdrop-blur-md border-r border-border-color dark:border-dark-border-color z-20 flex flex-col"
      style={{ top: 'var(--header-height, 80px)', height: 'calc(100vh - var(--header-height, 80px))' }}
      aria-label={`${viewName} Filters`}
    >
      <div className="flex-shrink-0 p-4 border-b border-border-color dark:border-dark-border-color">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-2">
            <FilterIcon className="h-5 w-5 text-highlight" />
            <h3 className="font-semibold text-primary-text dark:text-dark-primary-text text-sm uppercase tracking-wider">Filters</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="px-3 py-1 text-xs font-medium rounded-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg hover:bg-gray-100 dark:hover:bg-dark-primary-bg transition-colors text-secondary-text dark:text-dark-secondary-text"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
      <div className="flex-grow overflow-y-auto custom-scrollbar p-4 min-h-0">
        <div className="flex flex-col gap-y-5">
          {children}
        </div>
        {actionsContent && (
          <>
            <div className="my-4 border-t border-border-color dark:border-dark-border-color" />
            <div className="flex flex-col gap-y-5">
              {actionsContent}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default FilterSidebar;
