import { describe, it, expect } from 'vitest'
import { nextTick, ref } from 'vue'
import * as Y from 'yjs'
import { withSetup } from '../helpers/with-setup'
import { useProtoList } from '../../src/runtime/composables/useProtoList'

type Item = { name: string, value: number }

const defaults: Item = { name: '', value: 0 }

function makeDoc() {
  return new Y.Doc()
}

describe('useProtoList', () => {
  it('starts empty', () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() =>
      useProtoList<Item>(doc, 'list', { defaults }),
    )
    expect(result.items.value).toEqual([])
    cleanup()
    doc.destroy()
  })

  it('add() appends an item', async () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() =>
      useProtoList<Item>(doc, 'list', { defaults }),
    )
    result.add({ name: 'Alice', value: 1 })
    await nextTick()
    expect(result.items.value).toHaveLength(1)
    expect(result.items.value[0].name).toBe('Alice')
    cleanup()
    doc.destroy()
  })

  it('add() fills defaults for missing fields', async () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() =>
      useProtoList<Item>(doc, 'list', { defaults }),
    )
    result.add({ name: 'Bob' } as any)
    await nextTick()
    expect(result.items.value[0].value).toBe(0) // default filled
    cleanup()
    doc.destroy()
  })

  it('update() merges partial item', async () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() =>
      useProtoList<Item>(doc, 'list', { defaults }),
    )
    result.add({ name: 'Alice', value: 1 })
    await nextTick()
    result.update(0, { value: 99 })
    await nextTick()
    expect(result.items.value[0].name).toBe('Alice') // unchanged
    expect(result.items.value[0].value).toBe(99)
    cleanup()
    doc.destroy()
  })

  it('remove() deletes by index', async () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() =>
      useProtoList<Item>(doc, 'list', { defaults }),
    )
    result.add({ name: 'A', value: 1 })
    result.add({ name: 'B', value: 2 })
    result.add({ name: 'C', value: 3 })
    await nextTick()
    result.remove(1)
    await nextTick()
    expect(result.items.value.map(i => i.name)).toEqual(['A', 'C'])
    cleanup()
    doc.destroy()
  })

  it('move() reorders items', async () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() =>
      useProtoList<Item>(doc, 'list', { defaults }),
    )
    result.add({ name: 'a', value: 1 })
    result.add({ name: 'b', value: 2 })
    result.add({ name: 'c', value: 3 })
    await nextTick()
    result.move(0, 2)
    await nextTick()
    expect(result.items.value.map(i => i.name)).toEqual(['b', 'c', 'a'])
    cleanup()
    doc.destroy()
  })

  it('reset() empties the list', async () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() =>
      useProtoList<Item>(doc, 'list', { defaults }),
    )
    result.add({ name: 'A', value: 1 })
    result.add({ name: 'B', value: 2 })
    await nextTick()
    result.reset()
    await nextTick()
    expect(result.items.value).toEqual([])
    cleanup()
    doc.destroy()
  })

  it('maxItems prevents adding beyond limit', async () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() =>
      useProtoList<Item>(doc, 'list', { defaults, maxItems: 2 }),
    )
    result.add({ name: 'A', value: 1 })
    result.add({ name: 'B', value: 2 })
    result.add({ name: 'C', value: 3 }) // should be ignored
    await nextTick()
    expect(result.items.value).toHaveLength(2)
    cleanup()
    doc.destroy()
  })

  it('count computed ref equals items.length', async () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() =>
      useProtoList<Item>(doc, 'list', { defaults }),
    )
    expect(result.count.value).toBe(0)
    result.add({ name: 'A', value: 1 })
    await nextTick()
    expect(result.count.value).toBe(1)
    cleanup()
    doc.destroy()
  })

  it('Y.Array observe syncs to items', async () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() =>
      useProtoList<Item>(doc, 'list', { defaults }),
    )
    // Push directly to Y.Array
    result.dataArray.push([{ name: 'External', value: 77 }])
    await nextTick()
    expect(result.items.value[0].name).toBe('External')
    cleanup()
    doc.destroy()
  })

  it('migration applied when waitFor becomes true', async () => {
    const doc = makeDoc()
    const arr = doc.getArray<Item>('list')
    arr.push([{ name: 'old', value: 0 }])
    // Set stored version to 0 via meta map
    // (no meta = v0)

    const waitFor = ref(false)
    const { result, cleanup } = withSetup(() =>
      useProtoList<Item>(doc, 'list', {
        defaults,
        version: 1,
        migrations: {
          1: d => ({ ...d, name: `migrated:${d.name}` }),
        },
        waitFor,
      }),
    )

    // Not yet migrated
    await nextTick()
    expect(result.items.value[0]?.name).toBe('old')

    // Trigger migration
    waitFor.value = true
    await nextTick()
    await nextTick()
    expect(result.items.value[0]?.name).toBe('migrated:old')
    cleanup()
    doc.destroy()
  })

  it('migration not applied until waitFor is true', async () => {
    const doc = makeDoc()
    const arr = doc.getArray<Item>('list')
    arr.push([{ name: 'original', value: 0 }])

    const waitFor = ref(false)
    const { result, cleanup } = withSetup(() =>
      useProtoList<Item>(doc, 'list', {
        defaults,
        version: 1,
        migrations: {
          1: d => ({ ...d, name: 'migrated' }),
        },
        waitFor,
      }),
    )

    await nextTick()
    // waitFor is still false — migration should not have run
    expect(result.items.value[0]?.name).toBe('original')
    cleanup()
    doc.destroy()
  })
})
