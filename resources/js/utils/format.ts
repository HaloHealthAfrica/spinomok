/** Format KES currency — e.g. "KES 12,450" */
export function formatKES(amount: number | string | null | undefined, decimals = 0): string {
  const n = Number(amount ?? 0);
  return `KES ${n.toLocaleString('en-KE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Format litres — e.g. "142.5 L" */
export function formatLitres(litres: number | string | null | undefined, decimals = 1): string {
  return `${Number(litres ?? 0).toFixed(decimals)} L`;
}

/** Format a date string to DD MMM YYYY — e.g. "31 May 2026" */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
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

/** Return today's date as YYYY-MM-DD (local timezone) */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Compute delta percentage */
export function deltaPercent(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}
