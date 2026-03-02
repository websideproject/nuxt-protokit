import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import * as Y from 'yjs'
import { withSetup } from '../helpers/with-setup'
import { useProtoCollection } from '../../src/runtime/composables/useProtoCollection'
import type { CollectionSchema } from '../../src/runtime/types/schema'

const baseSchema: CollectionSchema = {
  key: 'items',
  title: 'Items',
  itemLabel: item => item.name ?? '',
  fields: {
    name: { type: 'text', label: 'Name', default: '' },
    score: { type: 'number', label: 'Score', default: 0 },
  },
  defaults: { name: '', score: 0 },
  searchable: true,
  searchFields: ['name'],
  sortBy: 'name',
  sortOrder: 'asc',
}

describe('useProtoCollection', () => {
  it('search filters by searchable fields', async () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      useProtoCollection(baseSchema, { existingDoc: doc }),
    )
    result.add({ name: 'hello', score: 1 })
    result.add({ name: 'world', score: 2 })
    await nextTick()

    result.search.value = 'hello'
    await nextTick()

    expect(result.filtered.value).toHaveLength(1)
    expect(result.filtered.value[0].name).toBe('hello')
    cleanup()
    doc.destroy()
  })

  it('search is case-insensitive', async () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      useProtoCollection(baseSchema, { existingDoc: doc }),
    )
    result.add({ name: 'hello', score: 1 })
    await nextTick()

    result.search.value = 'HELLO'
    await nextTick()

    expect(result.filtered.value).toHaveLength(1)
    cleanup()
    doc.destroy()
  })

  it('empty search returns all items', async () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      useProtoCollection(baseSchema, { existingDoc: doc }),
    )
    result.add({ name: 'a', score: 1 })
    result.add({ name: 'b', score: 2 })
    await nextTick()

    result.search.value = ''
    await nextTick()

    expect(result.filtered.value).toHaveLength(2)
    cleanup()
    doc.destroy()
  })

  it('search disabled when searchable: false', async () => {
    const doc = new Y.Doc()
    const noSearchSchema: CollectionSchema = { ...baseSchema, searchable: false }
    const { result, cleanup } = withSetup(() =>
      useProtoCollection(noSearchSchema, { existingDoc: doc }),
    )
    result.add({ name: 'hello', score: 1 })
    result.add({ name: 'world', score: 2 })
    await nextTick()

    result.search.value = 'hello'
    await nextTick()

    // No filtering when searchable = false
    expect(result.filtered.value).toHaveLength(2)
    cleanup()
    doc.destroy()
  })

  it('sortKey ascending sorts alphabetically', async () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      useProtoCollection(baseSchema, { existingDoc: doc }),
    )
    result.add({ name: 'charlie', score: 1 })
    result.add({ name: 'alice', score: 2 })
    result.add({ name: 'bob', score: 3 })
    await nextTick()

    result.sortKey.value = 'name'
    result.sortOrder.value = 'asc'
    await nextTick()

    expect(result.sorted.value.map(i => i.name)).toEqual(['alice', 'bob', 'charlie'])
    cleanup()
    doc.destroy()
  })

  it('sortKey descending reverses order', async () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      useProtoCollection(baseSchema, { existingDoc: doc }),
    )
    result.add({ name: 'alice', score: 1 })
    result.add({ name: 'bob', score: 2 })
    await nextTick()

    result.sortKey.value = 'name'
    result.sortOrder.value = 'desc'
    await nextTick()

    expect(result.sorted.value.map(i => i.name)).toEqual(['bob', 'alice'])
    cleanup()
    doc.destroy()
  })

  it('null values sort last regardless of order', async () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      useProtoCollection(baseSchema, { existingDoc: doc }),
    )
    result.add({ name: null as any, score: 0 })
    result.add({ name: 'bob', score: 1 })
    await nextTick()

    result.sortKey.value = 'name'
    result.sortOrder.value = 'asc'
    await nextTick()

    const names = result.sorted.value.map(i => i.name)
    expect(names[names.length - 1]).toBeNull()
    cleanup()
    doc.destroy()
  })

  it('sorted respects both search and sort', async () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      useProtoCollection(baseSchema, { existingDoc: doc }),
    )
    result.add({ name: 'foobar', score: 1 })
    result.add({ name: 'foo', score: 2 })
    result.add({ name: 'baz', score: 3 })
    await nextTick()

    result.search.value = 'foo' // matches 'foo' and 'foobar', not 'baz'
    result.sortKey.value = 'name'
    result.sortOrder.value = 'asc'
    await nextTick()

    expect(result.sorted.value.map(i => i.name)).toEqual(['foo', 'foobar'])
    cleanup()
    doc.destroy()
  })

  it('CRUD operations work correctly', async () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      useProtoCollection(baseSchema, { existingDoc: doc }),
    )

    result.add({ name: 'A', score: 1 })
    result.add({ name: 'B', score: 2 })
    await nextTick()
    expect(result.items.value).toHaveLength(2)

    result.update(0, { score: 99 })
    await nextTick()
    expect(result.items.value[0].score).toBe(99)

    result.remove(1)
    await nextTick()
    expect(result.items.value).toHaveLength(1)

    result.add({ name: 'C', score: 3 })
    result.add({ name: 'D', score: 4 })
    await nextTick()
    result.move(0, 1)
    await nextTick()
    expect(result.items.value[0].name).toBe('C')

    cleanup()
    doc.destroy()
  })

  it('existingDoc option makes isReady = true immediately', () => {
    const doc = new Y.Doc()
    const { result, cleanup } = withSetup(() =>
      useProtoCollection(baseSchema, { existingDoc: doc }),
    )
    expect(result.isReady.value).toBe(true)
    cleanup()
    doc.destroy()
  })
})
