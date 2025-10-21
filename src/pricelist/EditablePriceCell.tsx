import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckIcon, ExclamationTriangleIcon, PencilIcon } from '../ui/Icons';

interface EditablePriceCellProps {
    initialValue: number;
    onSave: (newValue: number) => Promise<void>;
    formatter: (value: number) => string;
    isEditable?: boolean;
}

const EditablePriceCell: React.FC<EditablePriceCellProps> = ({ initialValue, onSave, formatter, isEditable = true }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(String(initialValue));
    const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isEditing) {
            setValue(String(initialValue));
        }
    }, [initialValue, isEditing]);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    if (!isEditable) {
        return (
            <div className="w-28 text-right flex items-center justify-end gap-2 p-1">
                <span className="font-semibold text-primary-text dark:text-dark-primary-text">{formatter(initialValue)}</span>
            </div>
        );
    }
    
    const handleSave = async () => {
        const newValue = parseFloat(value);
        if (isNaN(newValue) || newValue < 0 || newValue === initialValue) {
            setIsEditing(false);
            setValue(String(initialValue));
            return;
        }

        setStatus('saving');
        try {
            await onSave(newValue);
            setStatus('idle');
            setIsEditing(false);
        } catch (err) {
            console.error("Failed to save price:", err);
            setStatus('error');
            setTimeout(() => {
                setStatus('idle');
                setValue(String(initialValue));
                setIsEditing(false);
            }, 2000);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setValue(String(initialValue));
        }
    };

    if (isEditing) {
        return (
            <div className="relative" onClick={e => e.stopPropagation()}>
                <input
                    ref={inputRef}
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    step="0.01"
                    className={`w-28 text-right bg-white dark:bg-dark-secondary-bg border-highlight shadow-glow ring-2 ring-highlight rounded-md py-1 px-2 text-sm text-primary-text dark:text-dark-primary-text focus:outline-none ${status === 'error' ? '!border-red-500 !ring-red-500' : ''}`}
                />
                 {status === 'saving' && <div className="absolute right-2 top-1/2 -translate-y-1/2"><svg className="animate-spin h-4 w-4 text-highlight" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>}
                 {status === 'error' && <ExclamationTriangleIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />}
            </div>
        );
    }

    return (
        <button
            onClick={(e) => { e.stopPropagation(); setStatus('idle'); setIsEditing(true); }}
            className="w-28 text-right group flex items-center justify-end gap-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-secondary-bg"
        >
            <span className="font-semibold text-primary-text dark:text-dark-primary-text">{formatter(initialValue)}</span>
            <PencilIcon className="h-3.5 w-3.5 text-secondary-text opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    );
};

export default EditablePriceCell;