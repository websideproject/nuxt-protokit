import { describe, it, expect } from 'vitest'
import {
  formatMoney,
  formatPercent,
  formatPercentFromRatio,
  formatNumber,
  applyFormat,
} from '../../src/runtime/utils/formatters'

describe('formatMoney', () => {
  it('returns "--" for null', () => {
    expect(formatMoney(null)).toBe('--')
  })

  it('returns "--" for undefined', () => {
    expect(formatMoney(undefined)).toBe('--')
  })

  it('returns "N/A" for Infinity', () => {
    expect(formatMoney(Infinity)).toBe('N/A')
    expect(formatMoney(-Infinity)).toBe('N/A')
  })

  it('formats numbers below 1000 as-is', () => {
    expect(formatMoney(999)).toBe('$999')
  })

  it('formats 1000 as $1K', () => {
    expect(formatMoney(1000)).toBe('$1K')
  })

  it('formats 1_500_000 as $1.5M', () => {
    expect(formatMoney(1_500_000)).toBe('$1.5M')
  })

  it('formats 2_000_000_000 as $2.0B', () => {
    expect(formatMoney(2_000_000_000)).toBe('$2.0B')
  })

  it('formats negative values with minus sign', () => {
    expect(formatMoney(-1_000)).toBe('-$1K')
  })

  it('formats with compact=false', () => {
    const result = formatMoney(1_234_567, { compact: false })
    expect(result).toContain('$')
    expect(result).toContain('1')
  })

  it('formats K with kDecimals=1', () => {
    expect(formatMoney(1_500, { kDecimals: 1 })).toBe('$1.5K')
  })
})

describe('formatPercent', () => {
  it('formats 0.5 as "0.5%"', () => {
    expect(formatPercent(0.5)).toBe('0.5%')
  })

  it('formats with custom decimals', () => {
    expect(formatPercent(1.2345, 2)).toBe('1.23%')
  })

  it('returns "N/A" for Infinity', () => {
    expect(formatPercent(Infinity)).toBe('N/A')
  })
})

describe('formatPercentFromRatio', () => {
  it('formats 0.25 as "25.0%"', () => {
    expect(formatPercentFromRatio(0.25)).toBe('25.0%')
  })

  it('formats 1 as "100.0%"', () => {
    expect(formatPercentFromRatio(1)).toBe('100.0%')
  })
})

describe('formatNumber', () => {
  it('formats 1_000_000 with locale separators', () => {
    const result = formatNumber(1_000_000)
    // Accept both "1,000,000" and locale-specific equivalents
    expect(result.replace(/[\s,\.]/g, '')).toBe('1000000')
  })

  it('returns "N/A" for Infinity', () => {
    expect(formatNumber(Infinity)).toBe('N/A')
  })
})

describe('applyFormat', () => {
  it('returns string of value when no format given', () => {
    expect(applyFormat(42)).toBe('42')
    expect(applyFormat('hello')).toBe('hello')
  })

  it('returns empty string for null with no format', () => {
    expect(applyFormat(null)).toBe('')
  })

  it('dispatches to formatMoney for "money"', () => {
    expect(applyFormat(5000, 'money')).toBe('$5K')
  })

  it('dispatches to formatPercent for "percent"', () => {
    expect(applyFormat(42.5, 'percent')).toBe('42.5%')
  })

  it('dispatches to formatNumber for "number"', () => {
    const result = applyFormat(1000, 'number')
    expect(result.replace(/[\s,\.]/g, '')).toBe('1000')
  })

  it('dispatches to formatDate for "date"', () => {
    // Any valid date string → non-empty localized string
    const result = applyFormat('2024-01-15', 'date')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('calls function format with value', () => {
    const fmt = (v: any) => `custom:${v}`
    expect(applyFormat(99, fmt)).toBe('custom:99')
  })
})
