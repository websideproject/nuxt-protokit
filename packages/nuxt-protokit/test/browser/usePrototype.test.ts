import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import * as Y from 'yjs'
import { withSetup } from '../helpers/with-setup'
import { usePrototype } from '../../src/runtime/composables/usePrototype'
import type { PrototypeSchema } from '../../src/runtime/types/schema'

const schema: PrototypeSchema = {
  key: 'test-tool',
  title: 'Test Tool',
  shortTitle: 'Test',
  description: 'Integration test prototype',
  icon: 'i-ph-test-tube',
  fields: {
    title: { type: 'text', label: 'Title', default: 'Hello' },
    count: { type: 'number', label: 'Count', default: 5 },
  },
  collections: {
    items: {
      key: 'items',
      title: 'Items',
      itemLabel: item => item.name ?? '',
      fields: {
        name: { type: 'text', label: 'Name', default: '' },
        qty: { type: 'number', label: 'Qty', default: 1 },
      },
      defaults: { name: '', qty: 1 },
    },
  },
  derived: {
    doubled: {
      compute: ctx => ctx.fields.count * 2,
    },
    summary: {
      compute: ctx => `${ctx.fields.title} x${ctx.derived.doubled}`,
    },
  },
}

describe('usePrototype (integration)', () => {
  it('state initialized from schema defaults', () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      usePrototype(schema, { existingDoc: doc }),
    )
    expect(result.state.title.value).toBe('Hello')
    expect(result.state.count.value).toBe(5)
    cleanup()
    doc.destroy()
  })

  it('state change reflects in Y.Map (bidirectional sync)', async () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      usePrototype(schema, { existingDoc: doc }),
    )

    result.state.title.value = 'Updated'
    await nextTick()

    const map = doc.getMap('test-tool')
    expect(map.get('title')).toBe('Updated')
    cleanup()
    doc.destroy()
  })

  it('collections.items CRUD works', async () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      usePrototype(schema, { existingDoc: doc }),
    )

    result.collections.items.add({ name: 'Widget', qty: 3 })
    await nextTick()
    expect(result.collections.items.items.value).toHaveLength(1)
    expect(result.collections.items.items.value[0].name).toBe('Widget')

    result.collections.items.update(0, { qty: 10 })
    await nextTick()
    expect(result.collections.items.items.value[0].qty).toBe(10)

    result.collections.items.remove(0)
    await nextTick()
    expect(result.collections.items.items.value).toHaveLength(0)

    cleanup()
    doc.destroy()
  })

  it('derived updates when state changes', async () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      usePrototype(schema, { existingDoc: doc }),
    )

    expect(result.derived.value.doubled).toBe(10) // 5 * 2

    result.state.count.value = 7
    await nextTick()

    expect(result.derived.value.doubled).toBe(14) // 7 * 2
    cleanup()
    doc.destroy()
  })

  it('derived chain: later derived references earlier derived', async () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      usePrototype(schema, { existingDoc: doc }),
    )

    // summary = `${title} x${doubled}` = 'Hello x10'
    expect(result.derived.value.summary).toBe('Hello x10')

    result.state.title.value = 'World'
    result.state.count.value = 3
    await nextTick()

    expect(result.derived.value.summary).toBe('World x6')
    cleanup()
    doc.destroy()
  })

  it('computeContext includes fields + derived + collections', async () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      usePrototype(schema, { existingDoc: doc }),
    )

    result.collections.items.add({ name: 'A', qty: 1 })
    await nextTick()

    const ctx = result.computeContext.value
    expect(ctx.fields).toHaveProperty('title')
    expect(ctx.fields).toHaveProperty('count')
    expect(ctx.derived).toHaveProperty('doubled')
    expect(ctx.collections).toHaveProperty('items')
    expect(Array.isArray(ctx.collections.items)).toBe(true)
    cleanup()
    doc.destroy()
  })

  it('reset() clears state AND collections', async () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      usePrototype(schema, { existingDoc: doc }),
    )

    result.state.title.value = 'Changed'
    result.state.count.value = 999
    result.collections.items.add({ name: 'X', qty: 5 })
    await nextTick()

    result.reset()
    await nextTick()

    expect(result.state.title.value).toBe('Hello')
    expect(result.state.count.value).toBe(5)
    expect(result.collections.items.items.value).toHaveLength(0)
    cleanup()
    doc.destroy()
  })

  it('existingDoc → isReady is true immediately', () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      usePrototype(schema, { existingDoc: doc }),
    )
    expect(result.isReady.value).toBe(true)
    cleanup()
    doc.destroy()
  })
})
