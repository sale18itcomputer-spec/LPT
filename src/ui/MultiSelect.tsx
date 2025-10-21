import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, XMarkIcon, MagnifyingGlassIcon, CheckIcon } from './Icons';

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabledOptions?: string[];
}

const popoverVariants = {
  hidden: { opacity: 0, scale: 0.98, y: -5 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 500, damping: 30 } },
  exit: { opacity: 0, scale: 0.98, y: -5, transition: { duration: 0.15 } },
};

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select options...',
  className = '',
  disabledOptions = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOutsideClick = useCallback((event: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      inputRef.current?.focus();
    } else {
      setSearchTerm('');
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, handleOutsideClick]);

  const toggleOption = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  const filteredOptions = useMemo(() =>
    options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase())),
    [options, searchTerm]
  );
  
  const DisplayValue = () => {
      if (selected.length === 0) {
          return <span className="text-secondary-text">{placeholder}</span>;
      }
      if (selected.length > 2) {
          return <span className="font-medium text-primary-text">{selected.length} selected</span>;
      }
      return (
          <div className="flex items-center gap-1.5 overflow-hidden">
              {selected.map(item => (
                  <span key={item} className="bg-gray-200 text-secondary-text text-xs font-medium px-2 py-0.5 rounded-md truncate">
                      {item}
                  </span>
              ))}
          </div>
      );
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <label className="block text-xs text-secondary-text mb-1 truncate">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between cursor-pointer appearance-none rounded-md bg-secondary-bg py-1.5 pl-3 pr-2 text-left border border-border-color focus:outline-none focus:ring-2 focus:ring-highlight text-sm transition-colors hover:border-gray-400"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex-grow truncate mr-2"><DisplayValue/></div>
        <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full mt-1.5 z-50 w-full origin-top-left bg-secondary-bg rounded-lg shadow-lg border border-border-color"
          >
            <div className="p-2">
              <div className="relative">
                 <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                 <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-gray-100 border-transparent rounded-md py-1.5 pl-8 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-highlight"
                 />
              </div>
            </div>
            <ul className="max-h-60 overflow-y-auto p-1" role="listbox">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(option => {
                  const isSelected = selected.includes(option);
                  const isDisabled = disabledOptions.includes(option);
                  return (
                    <li
                      key={option}
                      onClick={() => !isDisabled && toggleOption(option)}
                      className={`flex items-center px-2 py-1.5 text-sm text-primary-text rounded-md ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-highlight-hover'}`}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={isDisabled}
                      title={isDisabled ? "This filter is temporarily disabled due to data issues." : ""}
                    >
                      <div className={`w-4 h-4 mr-2.5 flex-shrink-0 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-highlight border-highlight' : 'bg-white border-gray-400'}`}>
                        {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
                      </div>
                      <span className="truncate">{option}</span>
                    </li>
                  );
                })
              ) : (
                <li className="px-3 py-2 text-sm text-center text-secondary-text">No results found.</li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MultiSelect;
