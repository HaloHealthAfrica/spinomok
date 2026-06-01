import React from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

/* Apple-style select — matches Input appearance exactly */
export function Select({
  label,
  error,
  hint,
  options,
  placeholder,
  id,
  className,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-[13px] font-medium pl-1"
          style={{ color: 'rgba(60,60,67,0.6)' }}
        >
          {label}
          {props.required && <span className="text-[#FF3B30] ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          {...props}
          id={selectId}
          aria-invalid={!!error}
          className={clsx(
            'w-full h-[44px] appearance-none bg-white rounded-[10px] px-3.5 pr-10',
            'text-[17px] text-black border transition-all duration-150',
            'focus:outline-none focus:ring-[3px] focus:ring-brand-500/25 focus:border-brand-600',
            'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
            error
              ? 'border-[#FF3B30] focus:ring-[#FF3B30]/20'
              : 'border-[rgba(60,60,67,0.18)]',
            className,
          )}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
          style={{ color: 'rgba(60,60,67,0.4)' }}
        />
      </div>
      {error && (
        <p className="text-[13px] text-[#FF3B30] pl-1" role="alert">{error}</p>
      )}
      {hint && !error && (
        <p className="text-[13px] pl-1" style={{ color: 'rgba(60,60,67,0.5)' }}>{hint}</p>
      )}
    </div>
  );
}
