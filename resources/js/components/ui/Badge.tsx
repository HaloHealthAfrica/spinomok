import React from 'react';
import { clsx } from 'clsx';
import type { AnimalStatus, AlertSeverity } from '@/types';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

/*
 * Apple HIG label/badge — uses system tint colors as backgrounds.
 * Rounded pill shape, tight padding.
 */
const variants: Record<BadgeVariant, string> = {
  success: 'bg-[rgba(52,199,89,0.12)]  text-[#28A745]',
  warning: 'bg-[rgba(255,149,0,0.12)]  text-[#D97706]',
  error:   'bg-[rgba(255,59,48,0.12)]  text-[#DC2626]',
  info:    'bg-[rgba(0,122,255,0.10)]  text-[#2563EB]',
  neutral: 'bg-[rgba(120,120,128,0.12)] text-[rgba(60,60,67,0.6)]',
  primary: 'bg-[rgba(27,94,32,0.10)]   text-[#1B5E20]',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-[#34C759]',
  warning: 'bg-[#FF9500]',
  error:   'bg-[#FF3B30]',
  info:    'bg-[#007AFF]',
  neutral: 'bg-[rgba(120,120,128,0.5)]',
  primary: 'bg-[#34C759]',
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm'
          ? 'px-2 py-0.5 text-[12px] tracking-[0.01em]'
          : 'px-2.5 py-1 text-[13px]',
        variants[variant],
        className,
      )}
    >
      {dot && (
        <span className={clsx('h-1.5 w-1.5 rounded-full shrink-0', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

export function getStatusVariant(status: AnimalStatus): BadgeVariant {
  const map: Record<AnimalStatus, BadgeVariant> = {
    lactating: 'success',
    dry:       'neutral',
    heifer:    'info',
    calf:      'primary',
    bull:      'neutral',
    culled:    'error',
    sold:      'error',
    dead:      'error',
  };
  return map[status] ?? 'neutral';
}

export function getSeverityVariant(severity: AlertSeverity): BadgeVariant {
  const map: Record<AlertSeverity, BadgeVariant> = {
    critical: 'error',
    warning:  'warning',
    info:     'info',
  };
  return map[severity];
}
