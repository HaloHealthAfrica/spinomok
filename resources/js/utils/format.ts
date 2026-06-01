/** Format KES currency — e.g. "KES 12,450" */
export function formatKES(amount: number, decimals = 0): string {
  return `KES ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Format litres — e.g. "142.5 L" */
export function formatLitres(litres: number, decimals = 1): string {
  return `${litres.toFixed(decimals)} L`;
}

/** Format a date string to DD MMM YYYY — e.g. "31 May 2026" */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format a date string to "Mon, 31 May 2026" */
export function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Return today's date as YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

/** Compute delta percentage */
export function deltaPercent(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}
