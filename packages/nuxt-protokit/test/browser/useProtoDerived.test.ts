import { describe, it, expect } from 'vitest'
import { nextTick, ref, isRef } from 'vue'
import { useProtoDerived } from '../../src/runtime/composables/useProtoDerived'
import type { DerivedDef } from '../../src/runtime/types/compute'

describe('useProtoDerived', () => {
  it('computes from field state', () => {
    const state = {
      price: ref(10),
      qty: ref(3),
    }
    const derived = useProtoDerived(state, {
      total: { compute: ctx => ctx.fields.price * ctx.fields.qty } as DerivedDef,
    })
    expect(derived.value.total).toBe(30)
  })

  it('updates reactively when state changes', async () => {
    const price = ref(10)
    const qty = ref(3)
    const state = { price, qty }
    const derived = useProtoDerived(state, {
      total: { compute: ctx => ctx.fields.price * ctx.fields.qty } as DerivedDef,
    })

    price.value = 20
    await nextTick()
    expect(derived.value.total).toBe(60)
  })

  it('later derived can reference earlier derived', () => {
    const state = {
      price: ref(100),
      tax: ref(0.1),
    }
    const derived = useProtoDerived(state, {
      subtotal: { compute: ctx => ctx.fields.price } as DerivedDef,
      total: { compute: ctx => ctx.derived.subtotal * (1 + ctx.fields.tax) } as DerivedDef,
    })
    expect(derived.value.subtotal).toBe(100)
    expect(derived.value.total).toBeCloseTo(110, 5)
  })

  it('collections are accessible in compute context', () => {
    const state = { count: ref(0) }
    const itemsRef = ref([{ val: 10 }, { val: 20 }])
    const derived = useProtoDerived(
      state,
      {
        sum: {
          compute: ctx => ctx.collections.items.reduce((acc: number, i: any) => acc + i.val, 0),
        } as DerivedDef,
      },
      { collections: { items: { items: itemsRef } } },
    )
    expect(derived.value.sum).toBe(30)
  })

  it('returns a ComputedRef (is lazy)', () => {
    const state = { x: ref(1) }
    const result = useProtoDerived(state, {
      double: { compute: ctx => ctx.fields.x * 2 } as DerivedDef,
    })
    expect(isRef(result)).toBe(true)
  })

  it('updates reactively when collection changes', async () => {
    const state = { _unused: ref(0) }
    const items = ref([{ v: 1 }])
    const derived = useProtoDerived(
      state,
      {
        total: { compute: ctx => ctx.collections.list.reduce((acc: number, i: any) => acc + i.v, 0) } as DerivedDef,
      },
      { collections: { list: { items } } },
    )

    expect(derived.value.total).toBe(1)
    items.value = [{ v: 1 }, { v: 2 }, { v: 3 }]
    await nextTick()
    expect(derived.value.total).toBe(6)
  })
})
