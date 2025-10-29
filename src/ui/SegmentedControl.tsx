
import React, { useCallback } from 'react';

interface SegmentedControlOption<T> {
  label: string;
  value: T;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

const SegmentedControl = <T extends string | number>({
  options,
  value,
  onChange,
  label,
  className = '',
}: SegmentedControlProps<T>) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, optionValue: T) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const delta = e.key === 'ArrowRight' ? 1 : -1;
        let nextIndex = (currentIndex + delta + options.length) % options.length;

        // Skip disabled options
        while (options[nextIndex]?.disabled && nextIndex !== currentIndex) {
          nextIndex = (nextIndex + delta + options.length) % options.length;
        }

        const nextOption = options[nextIndex];
        if (nextOption && !nextOption.disabled) {
          onChange(nextOption.value);
        }
      }
    },
    [options, value, onChange]
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={`flex flex-wrap items-center p-1 bg-gray-100 dark:bg-dark-secondary-bg/50 rounded-lg gap-1 ${className}`}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = value === opt.value;
        const isDisabled = opt.disabled;

        return (
          <button
            key={String(opt.value)}
            onClick={() => !isDisabled && onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, opt.value)}
            aria-pressed={isActive}
            disabled={isDisabled}
            tabIndex={isDisabled ? -1 : 0}
            className={`
              relative px-3 py-1 text-sm rounded-md font-medium transition-all
              focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2
              ${isActive
                ? 'bg-highlight text-white shadow-sm'
                : 'bg-transparent text-secondary-text dark:text-dark-secondary-text hover:bg-white/60 dark:hover:bg-dark-primary-bg/30'
              }
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {Icon && (
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? 'text-white' : 'text-current'
                  }`}
                />
              )}
              <span className="truncate">{opt.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
