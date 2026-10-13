/**
 * usePrototype wiring that spans tools and reloads:
 * - derived values see the values consumed from another tool's outputs
 * - an output is not rewritten when its value did not change
 * - a prototype's collection migrations run on the items IndexedDB delivers, not on the empty list before
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { nextTick } from 'vue'
import * as Y from 'yjs'
import { withSetup } from '../helpers/with-setup'
import { waitFor } from '../helpers/wait'
import { trackTestDb } from '../helpers/browser-setup'
import type { PrototypeSchema } from '../../src/runtime/types/schema'

beforeAll(() => {
  vi.stubGlobal('useRuntimeConfig', () => ({ public: {} }))
})

const { usePrototype } = await import('../../src/runtime/composables/usePrototype')

const meta = { title: 'T', shortTitle: 'T', description: '', icon: 'i-lucide-box' }

const producer: PrototypeSchema = {
  key: 'producer',
  ...meta,
  fields: {
    units: { type: 'number', label: 'Units', default: 2 },
    note: { type: 'text', label: 'Note', default: '' },
  },
  derived: { total: { compute: ({ fields }) => fields.units * 10 } },
  produces: { total: 'number' },
}

const consumer: PrototypeSchema = {
  key: 'consumer',
  ...meta,
  fields: {},
  consumes: { upstreamTotal: 'producer.total' },
  derived: { doubled: { compute: ({ connections }) => (connections.upstreamTotal ?? 0) * 2 } },
}

describe('usePrototype — produces / consumes', () => {
  it('derived values receive the consumed values, and follow them', async () => {
    const doc = new Y.Doc()
    const a = withSetup(() => usePrototype(producer, { existingDoc: doc }))
    const b = withSetup(() => usePrototype(consumer, { existingDoc: doc }))
    await nextTick()

    expect(b.result.derived.value.doubled).toBe(40)
    expect(b.result.computeContext.value.connections.upstreamTotal).toBe(20)

    a.result.state.units.value = 5
    await waitFor(() => b.result.derived.value.doubled === 100)

    a.cleanup()
    b.cleanup()
  })

  it('an output is only written when its value changes', async () => {
    const doc = new Y.Doc()
    const a = withSetup(() => usePrototype(producer, { existingDoc: doc }))
    await nextTick()

    let writes = 0
    doc.getMap('outputs:producer').observe(() => { writes++ })

    a.result.state.note.value = 'unrelated' // recomputes derived, `total` stays 20
    await nextTick()
    await nextTick()
    expect(writes).toBe(0)

    a.result.state.units.value = 3
    await waitFor(() => writes === 1)
    expect(doc.getMap('outputs:producer').get('total')).toBe(30)

    a.cleanup()
  })
})

describe('usePrototype — collection migrations', () => {
  const v0: PrototypeSchema = {
    key: 'migrating-tool',
    ...meta,
    fields: {},
    collections: {
      tasks: {
        key: 'tasks',
        title: 'Tasks',
        itemLabel: t => t.title,
        fields: { title: { type: 'text', label: 'Title', default: '' } },
        defaults: { title: '' },
      },
    },
  }
  const v1: PrototypeSchema = {
    ...v0,
    collections: {
      tasks: {
        ...v0.collections!.tasks,
        version: 1,
        migrations: { 1: ({ done, ...rest }) => ({ ...rest, status: done ? 'done' : 'open' }) },
        fields: { title: { type: 'text', label: 'Title', default: '' }, status: { type: 'select', label: 'Status', default: 'open', options: ['open', 'done'] } },
        defaults: { title: '', status: 'open' },
      },
    },
  }

  it('migrates the items stored before the version bump', async () => {
    const namespace = `migrate-${Date.now()}`
    trackTestDb(`proto:${namespace}:${v0.key}`)

    const first = withSetup(() => usePrototype(v0, { namespace }))
    await waitFor(() => first.result.isReady.value)
    first.result.collections.tasks.add({ title: 'Ship it', done: true })
    first.result.collections.tasks.add({ title: 'Plan it', done: false })
    await new Promise(r => setTimeout(r, 50))
    first.cleanup()
    await new Promise(r => setTimeout(r, 50))

    const second = withSetup(() => usePrototype(v1, { namespace }))
    await waitFor(() => second.result.isReady.value)
    await waitFor(() => second.result.collections.tasks.items.value.length === 2)
    await nextTick()

    const stored = second.result.collections.tasks.dataArray.toArray()
    expect(stored).toEqual([
      { title: 'Ship it', status: 'done' },
      { title: 'Plan it', status: 'open' },
    ])
    second.cleanup()
  })
})
