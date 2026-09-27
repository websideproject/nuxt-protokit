/**
 * Standalone formatting utilities for protokit module.
 * Copied from saaskit to avoid cross-module dependencies.
 */

/**
 * One fixed locale for every number and date protokit prints. Components render on the server too (charts, dashboards),
 * and `toLocaleString()` without a locale formats with the server's locale there and the visitor's in the browser — a
 * hydration mismatch for anyone whose locale differs ("22,935" vs "22.935").
 */
const LOCALE = 'en-US'

export function formatMoney(
  v: number | null | undefined,
  opts?: { kDecimals?: number, compact?: boolean },
): string {
  if (v == null) return '--'
  if (v === Infinity || v === -Infinity) return 'N/A'

  const compact = opts?.compact ?? true
  const kDec = opts?.kDecimals ?? 0
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''

  if (!compact) {
    return `${sign}$${abs.toLocaleString(LOCALE)}`
  }

  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(kDec)}K`
  return `${sign}$${abs.toLocaleString(LOCALE)}`
}

export function formatPercent(v: number, decimals = 1): string {
  if (v === Infinity || v === -Infinity) return 'N/A'
  return `${v.toFixed(decimals)}%`
}

export function formatPercentFromRatio(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`
}

export function formatNumber(v: number): string {
  if (v === Infinity || v === -Infinity) return 'N/A'
  return v.toLocaleString(LOCALE)
}

export function formatDate(v: string | Date): string {
  if (!v) return '--'
  const d = typeof v === 'string' ? new Date(v) : v
  return d.toLocaleDateString(LOCALE)
}

/**
 * Apply a format spec to a value.
 */
export function applyFormat(
  value: any,
  format?: 'money' | 'percent' | 'number' | 'date' | ((v: any) => string),
): string {
  if (!format) return String(value ?? '')
  if (typeof format === 'function') return format(value)
  switch (format) {
    case 'money': return formatMoney(value)
    case 'percent': return formatPercent(value)
    case 'number': return formatNumber(value)
    case 'date': return formatDate(value)
    default: return String(value ?? '')
  }
}
