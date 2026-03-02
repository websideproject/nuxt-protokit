import { describe, it, expect } from 'vitest'
import { deepClone } from '../../src/runtime/utils/deepClone'

describe('deepClone', () => {
  it('clones a number', () => {
    expect(deepClone(42)).toBe(42)
  })

  it('clones a string', () => {
    expect(deepClone('hello')).toBe('hello')
  })

  it('clones a boolean', () => {
    expect(deepClone(true)).toBe(true)
  })

  it('clones null', () => {
    expect(deepClone(null)).toBeNull()
  })

  it('clones a flat object', () => {
    const obj = { a: 1, b: 'two' }
    const clone = deepClone(obj)
    expect(clone).toEqual(obj)
    expect(clone).not.toBe(obj)
  })

  it('clones nested objects', () => {
    const obj = { outer: { inner: { deep: 42 } } }
    const clone = deepClone(obj)
    expect(clone).toEqual(obj)
    expect(clone.outer).not.toBe(obj.outer)
    expect(clone.outer.inner).not.toBe(obj.outer.inner)
  })

  it('clones arrays', () => {
    const arr = [1, [2, 3], { x: 4 }]
    const clone = deepClone(arr)
    expect(clone).toEqual(arr)
    expect(clone).not.toBe(arr)
    expect(clone[1]).not.toBe(arr[1])
  })

  it('cloned object is independent from original', () => {
    const obj = { a: { b: 1 } }
    const clone = deepClone(obj)
    clone.a.b = 99
    expect(obj.a.b).toBe(1)
  })
})
