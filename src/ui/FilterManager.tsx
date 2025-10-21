import React, { useState } from 'react';
import FilterSidebar from './FilterSidebar';
import FloatingFilterButton from './FloatingFilterButton';
import FilterBottomSheet from './FilterBottomSheet';

interface FilterManagerProps {
  children: React.ReactNode;
  onClear: () => void;
  hasActiveFilters: boolean;
  viewName: string; // e.g., 'Orders', 'Sales'
  sidebarActionsContent?: React.ReactNode;
}

const FilterManager: React.FC<FilterManagerProps> = ({ children, onClear, hasActiveFilters, viewName, sidebarActionsContent }) => {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <div className="hidden md:block">
        <FilterSidebar onClear={onClear} hasActiveFilters={hasActiveFilters} viewName={viewName} actionsContent={sidebarActionsContent}>
          {children}
        </FilterSidebar>
      </div>

      {/* Mobile Filter Components */}
      <div className="md:hidden">
        <FloatingFilterButton
          onClick={() => setIsFilterSheetOpen(true)}
          hasActiveFilters={hasActiveFilters}
        />
        <FilterBottomSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          onClear={() => { onClear(); setIsFilterSheetOpen(false); }}
          title={`${viewName} Filters`}
        >
          {children}
        </FilterBottomSheet>
      </div>
    </>
  );
};

export default FilterManager;
