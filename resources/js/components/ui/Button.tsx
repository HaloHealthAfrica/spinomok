import React from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'tinted' | 'plain';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/*
 * Apple HIG button styles:
 *  primary  → Filled, brand green, used for the most important action
 *  secondary → Bordered/outlined, secondary actions
 *  tinted   → Tinted with brand color (iOS system "tinted" button)
 *  ghost    → No background, label only
 *  danger   → Destructive red
 *  plain    → No styling, just text
 */
const variants: Record<Variant, string> = {
  primary:
    'bg-brand-900 text-white shadow-sm active:bg-brand-800 ' +
    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
  secondary:
    'bg-white text-brand-900 border border-separator-opaque shadow-sm ' +
    'active:bg-gray-50 ' +
    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
  tinted:
    'bg-brand-50 text-brand-900 ' +
    'active:bg-brand-100 ' +
    'focus-visible:ring-2 focus-visible:ring-brand-500',
  ghost:
    'bg-transparent text-brand-900 active:bg-fill-tertiary ' +
    'focus-visible:ring-2 focus-visible:ring-brand-500',
  danger:
    'bg-red-500 text-white shadow-sm active:bg-red-600 ' +
    'focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2',
  plain:
    'bg-transparent text-brand-900 underline-offset-2 ' +
    'focus-visible:ring-2 focus-visible:ring-brand-500',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[15px] gap-1.5 rounded-[10px]',
  md: 'h-[44px] px-5 text-[17px] gap-2 rounded-[12px]',
  lg: 'h-[50px] px-6 text-[17px] font-semibold gap-2 rounded-[14px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-all duration-100',
        'select-none cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        'active:scale-[0.97]',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}
