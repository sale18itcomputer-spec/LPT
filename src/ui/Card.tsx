
import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { ArrowsPointingOutIcon } from './Icons';

interface CustomCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  controls?: React.ReactNode;
  onExpand?: () => void;
}

// Omit 'title' from HTMLMotionProps to avoid conflict with our custom title prop
type CardProps = Omit<HTMLMotionProps<'div'>, 'children' | 'title'> & CustomCardProps;

const MotionDiv = motion.div;

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, title, description, controls, onExpand, ...props }, ref) => {
    const baseClassName = "bg-secondary-bg dark:bg-dark-secondary-bg rounded-2xl shadow-lg shadow-primary-text/5 dark:shadow-black/20 border border-border-color dark:border-dark-border-color flex flex-col min-w-0";
    const combinedClassName = [baseClassName, className].filter(Boolean).join(' ');
    const isClickable = !!props.onClick;

    const hasHeader = title || description || controls || onExpand;

    return (
        <MotionDiv 
            ref={ref} 
            className={combinedClassName} 
            whileHover={isClickable ? { y: -4, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.04)" } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            {...props}
        >
            {hasHeader && (
              <div className="flex justify-between items-start p-4 sm:p-6 border-b border-border-color dark:border-dark-border-color flex-wrap gap-2 flex-shrink-0">
                  <div className="flex-grow min-w-[150px]">
                      {title && <h3 className="text-lg font-semibold text-primary-text dark:text-dark-primary-text tracking-tight">{title}</h3>}
                      {description && <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1">{description}</p>}
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {controls}
                    {onExpand && (
                        <button onClick={onExpand} className="p-1.5 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover hover:text-primary-text dark:hover:text-dark-primary-text transition-colors" title="Expand chart">
                            <ArrowsPointingOutIcon className="h-5 w-5" />
                        </button>
                    )}
                  </div>
              </div>
            )}
            <div className={`flex-grow relative min-h-0 overflow-y-auto custom-scrollbar ${!hasHeader ? 'p-4 sm:p-6' : ''}`}>
              {children}
            </div>
        </MotionDiv>
    );
  }
);

Card.displayName = 'Card';

export default Card;