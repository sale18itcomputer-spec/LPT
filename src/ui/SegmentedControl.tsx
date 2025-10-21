import React from 'react';

interface SegmentedControlProps<T extends string | number> {
    options: { label: string; value: T }[];
    value: T;
    onChange: (value: T) => void;
    label: string;
}

const SegmentedControl = <T extends string | number>({ options, value, onChange, label }: SegmentedControlProps<T>) => (
    <div role="group" aria-label={label} className="flex flex-wrap items-center p-1 bg-gray-100 dark:bg-dark-secondary-bg/50 rounded-lg gap-1">
        {options.map(opt => (
            <button
                key={String(opt.value)}
                onClick={() => onChange(opt.value)}
                aria-pressed={value === opt.value}
                className={`relative text-center px-4 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-dark-secondary-bg/50 ${
                    value === opt.value 
                        ? 'bg-highlight text-white shadow-sm' 
                        : 'text-secondary-text dark:text-dark-secondary-text hover:bg-secondary-bg dark:hover:bg-dark-primary-bg'
                }`}
            >
                {opt.label}
            </button>
        ))}
    </div>
);

export default SegmentedControl;