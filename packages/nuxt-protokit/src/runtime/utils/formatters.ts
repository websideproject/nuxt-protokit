/**
 * Standalone formatting utilities for protokit module.
 * Copied from saaskit to avoid cross-module dependencies.
 */

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
    return `${sign}$${abs.toLocaleString()}`
  }

  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(kDec)}K`
  return `${sign}$${abs.toLocaleString()}`
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
  return v.toLocaleString()
}

export function formatDate(v: string | Date): string {
  if (!v) return '--'
  const d = typeof v === 'string' ? new Date(v) : v
  return d.toLocaleDateString()
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
