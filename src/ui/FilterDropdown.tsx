
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from './Icons';

interface FilterDropdownProps {
  label: React.ReactNode;
  icon?: React.FC<any>;
  children: React.ReactNode;
  active?: boolean;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({ label, icon: Icon, children, active = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEvents = (event: MouseEvent | KeyboardEvent) => {
            if (!isOpen) return;
            if (event.type === 'keydown' && (event as KeyboardEvent).key === 'Escape') {
                setIsOpen(false);
                return;
            }
            if (event.type === 'mousedown' && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleEvents);
        document.addEventListener("keydown", handleEvents);
        return () => {
            document.removeEventListener("mousedown", handleEvents);
            document.removeEventListener("keydown", handleEvents);
        };
    }, [isOpen]);
    
    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm font-medium transition-colors ${active ? 'bg-highlight-hover text-highlight border-highlight/50 dark:bg-dark-highlight-hover' : 'bg-secondary-bg dark:bg-dark-secondary-bg border-border-color dark:border-dark-border-color text-primary-text dark:text-dark-primary-text'}`}
            >
                {Icon && <Icon className="h-4 w-4 text-secondary-text dark:text-dark-secondary-text" />}
                <span>{label}</span>
                <ChevronDownIcon className="h-4 w-4 text-secondary-text dark:text-dark-secondary-text" />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute top-full mt-2 w-72 bg-secondary-bg dark:bg-dark-secondary-bg rounded-xl shadow-lg border border-border-color dark:border-dark-border-color z-40 origin-top-left p-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FilterDropdown;
