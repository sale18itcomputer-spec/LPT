
import React, { useState, useRef, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDaysIcon, ChevronDownIcon } from './Icons';

export type DateRangePreset = 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'all' | 'custom';

interface Preset {
  value: DateRangePreset;
  label: string;
}

interface DateRangePickerProps {
  presets: Preset[];
  currentPreset: DateRangePreset;
  startDate: string | null;
  endDate: string | null;
  onRangeChange: (params: { preset: DateRangePreset; startDate: string | null; endDate: string | null }) => void;
  label: string;
}

const toYYYYMMDD = (d: Date): string => {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const calculateDatesForPreset = (preset: DateRangePreset): { startDate: string | null, endDate: string | null } => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();

    let startDate: Date;
    let endDate: Date = new Date(Date.UTC(y, m, d));

    if (preset === 'all' || preset === 'custom') {
        return { startDate: null, endDate: null };
    }

    switch (preset) {
        case 'last30':
            startDate = new Date(Date.UTC(y, m, d));
            startDate.setUTCDate(startDate.getUTCDate() - 29);
            break;
        case 'last90':
            startDate = new Date(Date.UTC(y, m, d));
            startDate.setUTCDate(startDate.getUTCDate() - 89);
            break;
        case 'thisMonth':
            startDate = new Date(Date.UTC(y, m, 1));
            break;
        case 'lastMonth':
            startDate = new Date(Date.UTC(y, m - 1, 1));
            endDate = new Date(Date.UTC(y, m, 0));
            break;
        case 'thisQuarter':
            const q = Math.floor(m / 3);
            startDate = new Date(Date.UTC(y, q * 3, 1));
            break;
        case 'lastQuarter':
            const currentQuarter = Math.floor(m / 3);
            const lastQuarterYear = currentQuarter === 0 ? y - 1 : y;
            const lastQuarterStartMonth = currentQuarter === 0 ? 9 : (currentQuarter - 1) * 3;
            startDate = new Date(Date.UTC(lastQuarterYear, lastQuarterStartMonth, 1));
            endDate = new Date(Date.UTC(lastQuarterYear, lastQuarterStartMonth + 3, 0));
            break;
        case 'thisYear':
        default:
            startDate = new Date(Date.UTC(y, 0, 1));
            break;
    }

    return {
        startDate: toYYYYMMDD(startDate),
        endDate: toYYYYMMDD(endDate),
    };
};

const MotionDiv = motion.div;


export const DateRangePicker: React.FC<DateRangePickerProps> = ({ presets, currentPreset, startDate, endDate, onRangeChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [customStart, setCustomStart] = useState(startDate || '');
    const [customEnd, setCustomEnd] = useState(endDate || '');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const id = useId();

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);
    
    useEffect(() => {
        setCustomStart(startDate || '');
        setCustomEnd(endDate || '');
    }, [startDate, endDate]);

    const handlePresetClick = (preset: DateRangePreset) => {
        if (preset === 'custom') {
            onRangeChange({ preset: 'custom', startDate: customStart || null, endDate: customEnd || null });
        } else {
            const { startDate, endDate } = calculateDatesForPreset(preset);
            onRangeChange({ preset, startDate, endDate });
        }
        if (preset !== 'custom') {
            setIsOpen(false);
        }
    };
    
    const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
        const newStart = type === 'start' ? value : customStart;
        const newEnd = type === 'end' ? value : customEnd;
        
        if (type === 'start') setCustomStart(value);
        if (type === 'end') setCustomEnd(value);
        
        onRangeChange({ preset: 'custom', startDate: newStart || null, endDate: newEnd || null });
    };

    const displayLabel = () => {
        if (currentPreset === 'custom') {
            if (startDate && endDate) return `${startDate} → ${endDate}`;
            if (startDate) return `From ${startDate}`;
            if (endDate) return `Until ${endDate}`;
            return 'Custom Range';
        }
        return presets.find(p => p.value === currentPreset)?.label || 'Select Date Range';
    };

    const isActive = currentPreset !== 'all' && currentPreset !== 'thisYear';

    return (
        <div ref={wrapperRef} className="relative w-full sm:w-auto flex-grow min-w-[200px] sm:flex-grow-0 sm:w-64">
            <label htmlFor={id} className="block text-xs text-secondary-text mb-1">{label}</label>
            <button
                id={id}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between cursor-pointer rounded-md bg-secondary-bg py-1.5 pl-3 pr-2 text-left border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-bg dark:focus:ring-offset-dark-primary-bg focus:ring-highlight text-sm transition-all ${isActive ? 'border-highlight dark:border-highlight shadow-glow' : 'border-border-color dark:border-dark-border-color hover:border-gray-400 dark:hover:border-gray-500'}`}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <span className="flex items-center gap-2 overflow-hidden">
                    <CalendarDaysIcon className="h-4 w-4 text-secondary-text dark:text-dark-secondary-text flex-shrink-0" />
                    <span className={`font-medium truncate ${isActive ? 'text-highlight' : 'text-primary-text dark:text-dark-primary-text'}`}>{displayLabel()}</span>
                </span>
                <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <MotionDiv
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full mt-1.5 z-50 w-72 origin-top-left bg-secondary-bg dark:bg-dark-secondary-bg rounded-lg shadow-lg border border-border-color dark:border-dark-border-color p-2"
                    >
                        <div className="grid grid-cols-2 gap-1.5">
                            {presets.filter(p => p.value !== 'custom').map(preset => (
                                <button key={preset.value} onClick={() => handlePresetClick(preset.value)} className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${currentPreset === preset.value ? 'bg-highlight text-white font-semibold' : 'text-primary-text dark:text-dark-primary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover'}`}>
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-border-color dark:border-dark-border-color">
                             <div className="px-3 py-1.5 text-sm font-semibold text-primary-text dark:text-dark-primary-text">Custom Range</div>
                             <div className="p-2 space-y-2">
                                 <div>
                                    <label htmlFor={`${id}-start`} className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">Start Date</label>
                                    <input id={`${id}-start`} type="date" value={customStart} onChange={e => handleCustomDateChange('start', e.target.value)} max={customEnd || ''} className="block w-full bg-primary-bg dark:bg-dark-primary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-2 text-primary-text dark:text-dark-primary-text text-sm focus:outline-none focus:ring-2 focus:ring-highlight"/>
                                 </div>
                                 <div>
                                     <label htmlFor={`${id}-end`} className="block text-xs text-secondary-text dark:text-dark-secondary-text mb-1">End Date</label>
                                     <input id={`${id}-end`} type="date" value={customEnd} onChange={e => handleCustomDateChange('end', e.target.value)} min={customStart || ''} className="block w-full bg-primary-bg dark:bg-dark-primary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-2 text-primary-text dark:text-dark-primary-text text-sm focus:outline-none focus:ring-2 focus:ring-highlight"/>
                                 </div>
                             </div>
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
};