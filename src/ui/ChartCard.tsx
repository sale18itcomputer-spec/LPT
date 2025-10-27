

import React from 'react';
import { ArrowsPointingOutIcon } from './Icons';

interface ChartCardProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  controls?: React.ReactNode;
  onExpand?: () => void;
  className?: string;
}

const ChartCard = React.forwardRef<HTMLDivElement, ChartCardProps>(
  ({ children, title, description, controls, onExpand, className }, ref) => {
    const baseClassName = "bg-secondary-bg dark:bg-dark-secondary-bg rounded-xl border border-border-color dark:border-dark-border-color flex flex-col shadow-sm min-w-0";
    const combinedClassName = [baseClassName, className].filter(Boolean).join(' ');

    return (
        <div ref={ref} className={combinedClassName}>
            <div className="flex justify-between items-start p-4 sm:p-5 border-b border-border-color dark:border-dark-border-color flex-wrap gap-2 flex-shrink-0">
                <div className="flex-grow min-w-[150px]">
                    <h3 className="text-base font-semibold text-primary-text dark:text-dark-primary-text tracking-tight">{title}</h3>
                    {description && <p className="text-xs text-secondary-text dark:text-dark-secondary-text mt-1">{description}</p>}
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    {controls}
                    {onExpand && (
                        <button onClick={onExpand} className="p-1.5 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover" title="Expand chart">
                            <ArrowsPointingOutIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
            {/* Reduced padding for the chart content area */}
            <div className="flex-grow relative min-h-0 p-2 sm:p-3">
              {children}
            </div>
        </div>
    );
  }
);

ChartCard.displayName = 'ChartCard';

export default ChartCard;