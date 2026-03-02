import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import * as Y from 'yjs'
import { withSetup } from '../helpers/with-setup'
import { useProtoMap } from '../../src/runtime/composables/useProtoMap'
import type { FieldDef } from '../../src/runtime/types/schema'

// Simple schema for tests
const schema = {
  title: { type: 'text', label: 'Title', default: 'Untitled' } as FieldDef,
  count: { type: 'number', label: 'Count', default: 0 } as FieldDef,
  tags: { type: 'tags', label: 'Tags', default: [] as string[] } as FieldDef,
}

function makeDoc() {
  return new Y.Doc()
}

describe('useProtoMap', () => {
  it('initializes refs from schema defaults', () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() => useProtoMap(doc, 'test', schema))
    expect(result.state.title.value).toBe('Untitled')
    expect(result.state.count.value).toBe(0)
    expect(result.state.tags.value).toEqual([])
    cleanup()
    doc.destroy()
  })

  it('initializes from existing Y.Map values', () => {
    const doc = makeDoc()
    const map = doc.getMap('test')
    map.set('title', 'Existing Title')
    map.set('count', 42)

    const { result, cleanup } = withSetup(() => useProtoMap(doc, 'test', schema))
    expect(result.state.title.value).toBe('Existing Title')
    expect(result.state.count.value).toBe(42)
    cleanup()
    doc.destroy()
  })

  it('syncs ref change → Y.Map', async () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() => useProtoMap(doc, 'test', schema))

    result.state.title.value = 'New Title'
    await nextTick()

    expect(result.dataMap.get('title')).toBe('New Title')
    cleanup()
    doc.destroy()
  })

  it('syncs Y.Map change → ref', async () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() => useProtoMap(doc, 'test', schema))

    result.dataMap.set('count', 99)
    await nextTick()

    expect(result.state.count.value).toBe(99)
    cleanup()
    doc.destroy()
  })

  it('does not create infinite feedback loops', async () => {
    const doc = makeDoc()
    let observeCount = 0
    const { result, cleanup } = withSetup(() => useProtoMap(doc, 'test', schema))

    result.dataMap.observe(() => { observeCount++ })
    result.state.title.value = 'ping'
    await nextTick()
    await nextTick()

    // One observe call for the initial set + one for the ref watch update
    // The key is it does NOT keep triggering after settling
    expect(observeCount).toBeLessThan(5)
    cleanup()
    doc.destroy()
  })

  it('avoids spurious updates for arrays (tags) using deep comparison', async () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() => useProtoMap(doc, 'test', schema))

    result.state.tags.value = ['a', 'b']
    await nextTick()

    let setCount = 0
    result.dataMap.observe((e) => {
      e.changes.keys.forEach((_, k) => { if (k === 'tags') setCount++ })
    })

    // Setting same value again should not trigger Y.Map update
    result.state.tags.value = ['a', 'b']
    await nextTick()

    expect(setCount).toBe(0)
    cleanup()
    doc.destroy()
  })

  it('reset() restores all defaults', async () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() => useProtoMap(doc, 'test', schema))

    result.state.title.value = 'Changed'
    result.state.count.value = 100
    await nextTick()

    result.reset()
    await nextTick()

    expect(result.state.title.value).toBe('Untitled')
    expect(result.state.count.value).toBe(0)
    cleanup()
    doc.destroy()
  })

  it('set() updates Y.Map directly', async () => {
    const doc = makeDoc()
    const { result, cleanup } = withSetup(() => useProtoMap(doc, 'test', schema))

    result.set('title', 'Direct')
    await nextTick()

    expect(result.dataMap.get('title')).toBe('Direct')
    // Also verify ref gets synced
    expect(result.state.title.value).toBe('Direct')
    cleanup()
    doc.destroy()
  })

  it('applies migration on version bump', async () => {
    const doc = makeDoc()
    // Pre-populate with v0 data
    const map = doc.getMap('test')
    map.set('title', 'old title')
    map.set('count', 5)
    // No __proto_version__ = stored at v0

    const { result, cleanup } = withSetup(() =>
      useProtoMap(doc, 'test', schema, {
        version: 1,
        migrations: {
          1: d => ({ ...d, title: `migrated:${d.title}` }),
        },
      }),
    )

    await nextTick()
    expect(result.state.title.value).toBe('migrated:old title')
    cleanup()
    doc.destroy()
  })

  it('applies migration chain v0 → v3', async () => {
    const doc = makeDoc()
    const map = doc.getMap('test')
    map.set('count', 0)

    const { result, cleanup } = withSetup(() =>
      useProtoMap(doc, 'test', schema, {
        version: 3,
        migrations: {
          1: d => ({ ...d, count: (d.count ?? 0) + 1 }),
          2: d => ({ ...d, count: (d.count ?? 0) + 10 }),
          3: d => ({ ...d, count: (d.count ?? 0) + 100 }),
        },
      }),
    )

    await nextTick()
    expect(result.state.count.value).toBe(111)
    cleanup()
    doc.destroy()
  })

  it('no migration when versions equal', async () => {
    const doc = makeDoc()
    const map = doc.getMap('test')
    map.set('title', 'current')
    map.set('__proto_version__', 2)

    const { result, cleanup } = withSetup(() =>
      useProtoMap(doc, 'test', schema, {
        version: 2,
        migrations: {
          2: d => ({ ...d, title: 'should-not-run' }),
        },
      }),
    )

    await nextTick()
    expect(result.state.title.value).toBe('current')
    cleanup()
    doc.destroy()
  })
})
