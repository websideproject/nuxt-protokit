import { describe, it, expect } from 'vitest'
import { barColorClass } from '../../src/runtime/utils/vizColor'

describe('barColorClass', () => {
  it('maps Nuxt UI colour names to their background class', () => {
    expect(barColorClass('error')).toBe('bg-error')
    expect(barColorClass('warning')).toBe('bg-warning')
    expect(barColorClass('success')).toBe('bg-success')
    expect(barColorClass('primary')).toBe('bg-primary')
  })

  it('uses a class as given', () => {
    expect(barColorClass('bg-emerald-500')).toBe('bg-emerald-500')
    expect(barColorClass('bg-error')).toBe('bg-error')
  })
})
