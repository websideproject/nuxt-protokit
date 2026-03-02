import { describe, it, expect } from 'vitest'
import { runMigrations } from '../../src/runtime/utils/runMigrations'

describe('runMigrations', () => {
  it('no-op when versions match', () => {
    const data = { name: 'Alice', age: 30 }
    const result = runMigrations(data, 2, 2, {
      2: d => ({ ...d, extra: 'should not run' }),
    })
    expect(result).toEqual({ name: 'Alice', age: 30 })
  })

  it('applies a single migration step', () => {
    const data = { name: 'Alice' }
    const result = runMigrations(data, 0, 1, {
      1: d => ({ ...d, version: 'v1' }),
    })
    expect(result).toEqual({ name: 'Alice', version: 'v1' })
  })

  it('applies a chain of migrations in order', () => {
    const log: number[] = []
    const data = { value: 0 }
    const result = runMigrations(data, 0, 3, {
      1: d => { log.push(1); return { ...d, value: d.value + 1 } },
      2: d => { log.push(2); return { ...d, value: d.value + 10 } },
      3: d => { log.push(3); return { ...d, value: d.value + 100 } },
    })
    expect(log).toEqual([1, 2, 3])
    expect(result.value).toBe(111)
  })

  it('skips missing migration steps', () => {
    const data = { x: 0 }
    // Only migration[3] defined; steps 1 and 2 are gaps
    const result = runMigrations(data, 0, 3, {
      3: d => ({ ...d, x: 99 }),
    })
    expect(result).toEqual({ x: 99 })
  })

  it('applies partial range when storedVersion > 0', () => {
    const log: number[] = []
    const data = { v: 0 }
    const result = runMigrations(data, 2, 4, {
      1: () => { log.push(1); return data }, // should NOT run
      2: () => { log.push(2); return data }, // should NOT run (storedVersion = 2)
      3: d => { log.push(3); return { ...d, v: d.v + 1 } },
      4: d => { log.push(4); return { ...d, v: d.v + 10 } },
    })
    expect(log).toEqual([3, 4])
    expect(result.v).toBe(11)
  })

  it('returns a new object reference', () => {
    const data = { a: 1 }
    const result = runMigrations(data, 0, 1, {
      1: d => ({ ...d, b: 2 }),
    })
    expect(result).not.toBe(data)
  })

  it('returns original reference when no migration applies', () => {
    const data = { a: 1 }
    const result = runMigrations(data, 5, 5, {})
    // No migration runs — same reference is fine (function just returns `result = data`)
    expect(result).toEqual({ a: 1 })
  })
})
