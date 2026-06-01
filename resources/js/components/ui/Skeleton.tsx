import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  rounded?: boolean;
}

/* Apple-style shimmer skeleton — uses the iOS system fill color */
export function Skeleton({ className, rounded = false }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse',
        rounded ? 'rounded-full' : 'rounded-[8px]',
        className,
      )}
      style={{ background: 'rgba(120,120,128,0.12)' }}
      aria-hidden="true"
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div
      className="bg-white rounded-[12px] p-4 space-y-3"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      <Skeleton className="h-9 w-9" rounded />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function AnimalCardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
      <Skeleton className="h-[44px] w-[44px] shrink-0" rounded />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}
