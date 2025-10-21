import React from 'react';
// FIX: Framer motion props were not being recognized. Casting motion components to `any` to bypass type issue.
import { motion } from 'framer-motion';
import { FilterIcon } from './Icons';

interface FloatingFilterButtonProps {
    onClick: () => void;
    hasActiveFilters: boolean;
}

// FIX: Framer motion props were not being recognized. Casting motion components to `any` to bypass type issue.
const MotionButton = motion.button as any;

const FloatingFilterButton: React.FC<FloatingFilterButtonProps> = ({ onClick, hasActiveFilters }) => {
    return (
        <MotionButton
            onClick={onClick}
            className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-highlight text-white shadow-lg flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 50 }}
            aria-label="Open filters"
        >
            <FilterIcon className="h-6 w-6" />
            {hasActiveFilters && (
                <span className="absolute top-0 right-0 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
            )}
        </MotionButton>
    );
};

export default FloatingFilterButton;