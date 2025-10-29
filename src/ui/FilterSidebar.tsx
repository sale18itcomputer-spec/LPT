

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FilterIcon, ChevronLeftIcon, XCircleIcon } from './Icons';

interface FilterSidebarProps {
  children: React.ReactNode;
  onClear: () => void;
  hasActiveFilters: boolean;
  viewName: string;
  actionsContent?: React.ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ children, onClear, hasActiveFilters, viewName, actionsContent, isCollapsed = false, onToggleCollapse }) => {
  return (
    <aside
      className={`fixed top-20 left-0 h-[calc(100vh-80px)] z-20 flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-72'} p-3`}
      style={{ top: 'var(--header-height, 80px)', height: 'calc(100vh - var(--header-height, 80px))' }}
      aria-label={`${viewName} Filters`}
    >
      <motion.div 
        layout 
        className="relative w-full h-full bg-secondary-bg/60 dark:bg-dark-secondary-bg/50 backdrop-blur-2xl border border-border-color dark:border-dark-border-color rounded-2xl flex flex-col overflow-hidden"
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 flex items-center justify-between border-b border-border-color dark:border-dark-border-color">
          <div className="flex items-center gap-x-2 overflow-hidden">
            <FilterIcon className="h-5 w-5 text-highlight flex-shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.h3 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="font-semibold text-primary-text dark:text-dark-primary-text text-sm uppercase tracking-wider whitespace-nowrap"
                >
                  Filters
                </motion.h3>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-grow overflow-y-auto custom-scrollbar p-4 min-h-0 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Footer */}
        <div className="flex-shrink-0 mt-auto p-3 border-t border-border-color dark:border-dark-border-color">
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              <motion.div
                key="collapsed-footer"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-2"
              >
                {hasActiveFilters && (
                   <button onClick={onClear} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500" title="Clear all filters">
                      <XCircleIcon className="h-6 w-6"/>
                   </button>
                )}
                <button onClick={onToggleCollapse} className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-dark-primary-bg hover:bg-gray-200 dark:hover:bg-dark-border-color" title="Expand filters">
                  <ChevronLeftIcon className="h-5 w-5 text-secondary-text rotate-180" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="expanded-footer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                {hasActiveFilters && (
                  <button
                    onClick={onClear}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg hover:bg-gray-100 dark:hover:bg-dark-primary-bg transition-colors text-secondary-text dark:text-dark-secondary-text"
                  >
                    <XCircleIcon className="h-4 w-4" />
                    Clear All Filters
                  </button>
                )}
                <button onClick={onToggleCollapse} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-dark-primary-bg hover:bg-gray-200 dark:hover:bg-dark-border-color text-secondary-text dark:text-dark-secondary-text" title="Collapse filters">
                  <ChevronLeftIcon className="h-5 w-5" />
                  Collapse
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </aside>
  );
};

export default FilterSidebar;