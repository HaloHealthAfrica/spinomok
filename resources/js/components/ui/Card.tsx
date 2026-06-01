import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Inset: subtle inner shadow + border — Apple default grouped card */
  inset?: boolean;
}

const paddings = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-5',
};

/*
 * Apple grouped list card:
 *  - Pure white surface
 *  - Very subtle shadow (0 1px 3px with low opacity)
 *  - 12px radius (Apple uses 10–14px for content cards)
 *  - No heavy border — uses a hairline separator tint
 */
export function Card({ children, className, onClick, padding = 'md', inset = false }: CardProps) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={clsx(
        'bg-white rounded-[12px]',
        // Apple-style subtle shadow
        'shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]',
        inset && 'ring-1 ring-[rgba(60,60,67,0.12)]',
        paddings[padding],
        onClick && [
          'w-full text-left cursor-pointer',
          'transition-colors duration-100',
          'active:bg-[rgba(0,0,0,0.04)]',
        ],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/* Grouped list section — wraps multiple row items */
export function CardGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'bg-white rounded-[12px] overflow-hidden',
        'shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* Individual row inside a CardGroup */
export function CardRow({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-3 text-left',
        'min-h-[44px]',
        '[&+&]:border-t [&+&]:border-[rgba(60,60,67,0.12)]',
        onClick && 'active:bg-[rgba(0,0,0,0.04)] transition-colors duration-75 cursor-pointer',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
