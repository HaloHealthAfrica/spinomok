import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  unit?: string;
}

/*
 * Apple HIG text field:
 * - Inset grouped appearance (white background, 10px radius)
 * - Label above (SF Pro subheadline weight)
 * - Error in red below
 * - Focus ring uses brand green
 */
export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightElement,
  unit,
  id,
  className,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-medium text-secondary-text pl-1"
          style={{ color: 'rgba(60,60,67,0.6)' }}
        >
          {label}
          {props.required && (
            <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <span
            className="absolute left-3.5 pointer-events-none"
            style={{ color: 'rgba(60,60,67,0.4)' }}
          >
            {leftIcon}
          </span>
        )}

        <input
          {...props}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` :
            hint  ? `${inputId}-hint`  : undefined
          }
          className={clsx(
            // iOS text field base
            'w-full bg-white rounded-[10px] px-3.5',
            'text-[17px] text-black placeholder:text-gray-400',
            'border transition-all duration-150',
            // Height — Apple recommends 44pt minimum touch target
            'h-[44px]',
            // Focus — thin brand-colored ring inside
            'focus:outline-none focus:ring-[3px] focus:ring-brand-500/25 focus:border-brand-600',
            // States
            error
              ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500'
              : 'border-[rgba(60,60,67,0.18)]',
            'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
            leftIcon && 'pl-10',
            (unit || rightElement) && 'pr-12',
            className,
          )}
        />

        {unit && (
          <span
            className="absolute right-3.5 text-[15px] pointer-events-none select-none"
            style={{ color: 'rgba(60,60,67,0.5)' }}
          >
            {unit}
          </span>
        )}
        {rightElement && !unit && (
          <span className="absolute right-3.5">{rightElement}</span>
        )}
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          className="text-[13px] text-red-500 pl-1"
          role="alert"
        >
          {error}
        </p>
      )}
      {hint && !error && (
        <p
          id={`${inputId}-hint`}
          className="text-[13px] pl-1"
          style={{ color: 'rgba(60,60,67,0.5)' }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
