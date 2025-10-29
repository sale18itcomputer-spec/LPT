
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowsPointingOutIcon } from './Icons';

interface ChartCardProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  controls?: React.ReactNode;
  onExpand?: () => void;
  className?: string;
  loading?: boolean;
  error?: string;
  badge?: React.ReactNode;
}

const ChartCard = React.forwardRef<HTMLDivElement, ChartCardProps>(
  ({ children, title, description, controls, onExpand, className, loading = false, error, badge }, ref) => {
    
    const baseClassName = "bg-secondary-bg dark:bg-dark-secondary-bg rounded-2xl shadow-lg shadow-primary-text/5 dark:shadow-black/20 border border-border-color dark:border-dark-border-color flex flex-col min-w-0 overflow-hidden";
    const combinedClassName = [baseClassName, className].filter(Boolean).join(' ');

    return (
        <motion.div 
            ref={ref} 
            className={combinedClassName}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b border-border-color dark:border-dark-border-color flex-wrap gap-3 flex-shrink-0">
                <div className="flex-grow min-w-[150px] space-y-1.5">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-primary-text dark:text-dark-primary-text tracking-tight">
                            {title}
                        </h3>
                        {badge && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {badge}
                            </motion.div>
                        )}
                    </div>
                    {description && (
                        <p className="text-sm text-secondary-text dark:text-dark-secondary-text leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                    {controls}
                    {onExpand && (
                        <motion.button 
                            onClick={onExpand} 
                            className="p-2 rounded-lg text-secondary-text dark:text-dark-secondary-text hover:bg-gray-100 dark:hover:bg-dark-secondary-bg/50"
                            title="Expand chart"
                        >
                            <ArrowsPointingOutIcon className="h-5 w-5" />
                        </motion.button>
                    )}
                </div>
            </div>
            
            {/* Content Area */}
            <div className="flex-grow relative min-h-0 p-6 pt-0">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-secondary-bg/80 dark:bg-dark-secondary-bg/80 backdrop-blur-sm"
                        >
                             <div className="relative">
                                <motion.div
                                    className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-highlight dark:border-t-highlight rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                            </div>
                            <p className="mt-4 text-sm font-medium text-secondary-text dark:text-dark-secondary-text">
                                Loading...
                            </p>
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/10 rounded-lg p-4"
                        >
                            <div className="text-center">
                                 <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">
                                    Unable to load chart
                                </p>
                                <p className="text-xs text-red-700 dark:text-red-300">
                                    {error}
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full w-full"
                        >
                            {children}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
  }
);

ChartCard.displayName = 'ChartCard';

export default ChartCard;