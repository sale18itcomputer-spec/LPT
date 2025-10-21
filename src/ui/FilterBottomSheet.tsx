
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from './Icons';

interface FilterBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onClear: () => void;
    title: string;
    children: React.ReactNode;
}

const backdropVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
};

const sheetVariants = {
    visible: { y: 0 },
    hidden: { y: '100%' },
};

const MotionDiv = motion.div;

const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({ isOpen, onClose, onClear, title, children }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <MotionDiv
                        className="fixed inset-0 bg-black/50 z-40"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        onClick={onClose}
                    />
                    <MotionDiv
                        className="fixed bottom-0 left-0 right-0 z-50 bg-secondary-bg dark:bg-dark-secondary-bg rounded-t-2xl shadow-lg flex flex-col"
                        style={{ maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
                        variants={sheetVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                    >
                        {/* Header */}
                        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border-color dark:border-dark-border-color">
                            <h2 className="text-lg font-bold text-primary-text dark:text-dark-primary-text">{title}</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-secondary-bg/50">
                                <XMarkIcon className="h-6 w-6 text-secondary-text" />
                            </button>
                        </header>

                        {/* Content */}
                        <div className="flex-grow overflow-y-auto p-4">
                            <div className="flex flex-col gap-4">
                                {children}
                            </div>
                        </div>

                        {/* Footer */}
                        <footer className="flex-shrink-0 flex items-center justify-end gap-3 p-4 border-t border-border-color dark:border-dark-border-color">
                            <button
                                onClick={onClear}
                                className="px-4 py-2 text-sm font-medium rounded-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg hover:bg-gray-100 dark:hover:bg-dark-primary-bg"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 text-sm font-medium text-white bg-highlight rounded-md hover:bg-indigo-700"
                            >
                                Done
                            </button>
                        </footer>
                    </MotionDiv>
                </>
            )}
        </AnimatePresence>
    );
};

export default FilterBottomSheet;