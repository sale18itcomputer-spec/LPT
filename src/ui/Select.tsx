import React, { useId } from 'react';
import { ChevronDownIcon } from './Icons';

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

const Select: React.FC<SelectProps> = ({ label, value, onChange, options }) => {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="block text-xs text-secondary-text mb-1 truncate">{label}</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full cursor-pointer appearance-none rounded-md bg-secondary-bg py-1.5 pl-3 pr-8 text-left border border-border-color focus:outline-none focus:ring-2 focus:ring-highlight text-sm transition-colors hover:border-gray-400 text-primary-text`}
        >
          <option value="all">All</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDownIcon className={`h-5 w-5 text-gray-400`} />
        </span>
      </div>
    </div>
  );
};

export default Select;
