import React from 'react';

interface Props {
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
}

// Simple baby-cow SVG icon matching Lucide stroke style
export function CalfIcon({ className, style, strokeWidth = 1.8 }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Body */}
      <ellipse cx="12" cy="13" rx="6" ry="4" />
      {/* Head */}
      <circle cx="18" cy="9" r="2.5" />
      {/* Ear */}
      <path d="M19.5 7 Q21 5 20 4 Q19 6 18.5 6.5" />
      {/* Legs */}
      <line x1="8"  y1="17" x2="7"  y2="21" />
      <line x1="10" y1="17" x2="10" y2="21" />
      <line x1="14" y1="17" x2="14" y2="21" />
      <line x1="16" y1="17" x2="17" y2="21" />
      {/* Tail */}
      <path d="M6 12 Q4 11 3 13" />
      {/* Spots */}
      <ellipse cx="11" cy="12" rx="1.5" ry="1" opacity="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
