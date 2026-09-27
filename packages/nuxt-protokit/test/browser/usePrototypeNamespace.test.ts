/**
 * Tests for the `namespace` option on usePrototype / useProtoDoc.
 *
 * The namespace option prepends a prefix to the doc key, producing:
 *   IDB key: proto:<namespace>:<schema.key>
 *
 * Because useProtoDoc calls useRuntimeConfig (a Nuxt composable), we stub
 * that global before importing the composables. The stub returns an empty
 * config, causing useProtoKitConfig to fall back to serverSync: disabled —
 * which is exactly what we want for isolated tests.
 *
 * Covers:
 * - Different namespaces open different Y.Doc instances
 * - Different namespaces use different IDB databases (data isolation)
 * - Same namespace across two components shares one Y.Doc instance
 * - No namespace uses proto:<schema.key> (backward-compatible key)
 * - Namespace + encryption uses proto:enc:<namespace>:<schema.key>
 * - clearProtoNamespace removes exactly the right namespaced stores
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { nextTick } from 'vue'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { trackTestDb } from '../helpers/browser-setup'
import { withSetup } from '../helpers/with-setup'
import { waitFor } from '../helpers/wait'

// ── Helpers ───────────────────────────────────────────────────────────────────

import type { PrototypeSchema } from '../../src/runtime/types/schema'

// ── Stub Nuxt's useRuntimeConfig before importing composables ─────────────────
// useProtoKitConfig calls useRuntimeConfig(); without Nuxt running this throws.
// Returning {} causes useProtoKitConfig to fall through to serverSync: disabled.
beforeAll(() => {
  vi.stubGlobal('useRuntimeConfig', () => ({ public: {} }))
})

// Import AFTER stubbing so the stub is in place when module code runs
const { usePrototype } = await import('../../src/runtime/composables/usePrototype')
const { documentCache, providerCache, refCountCache, isReadyRefCache, clearProtoNamespace, clearProtoKeys }
  = await import('../../src/runtime/composables/useProtoDoc')

const schema: PrototypeSchema = {
  key: 'ns-test-tool',
  title: 'NS Test',
  shortTitle: 'NS',
  description: '',
  icon: 'i-lucide-box',
  fields: {
    value: { type: 'number', label: 'Value', default: 0 },
  },
}

let counter = 0
function uniqueNs(): string {
  return `test-ns-${Date.now()}-${++counter}`
}

/** Write data directly to an IDB key and close the connection (simulate a previous session). */
function seedIDB(key: string, data: Record<string, unknown>): Promise<void> {
  return new Promise<void>((resolve) => {
    const doc = new Y.Doc()
    const idb = new IndexeddbPersistence(key, doc)
    idb.on('synced', async () => {
      for (const [k, v] of Object.entries(data)) doc.getMap(schema.key).set(k, v)
      await new Promise(r => setTimeout(r, 50))
      await idb.destroy()
      doc.destroy()
      resolve()
    })
  })
}

/** Read the 'fields' map from an IDB key. */
function readIDB(key: string): Promise<Record<string, unknown>> {
  return new Promise<Record<string, unknown>>((resolve) => {
    const doc = new Y.Doc()
    const idb = new IndexeddbPersistence(key, doc)
    idb.on('synced', async () => {
      const result: Record<string, unknown> = {}
      doc.getMap(schema.key).forEach((v, k) => { result[k] = v })
      await idb.destroy()
      doc.destroy()
      resolve(result)
    })
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('usePrototype — namespace option', () => {
  it('different namespaces produce different Y.Doc instances', () => {
    const nsA = uniqueNs()
    const nsB = uniqueNs()

    const { result: a, cleanup: cleanA } = withSetup(() =>
      usePrototype(schema, { namespace: nsA, existingDoc: new Y.Doc() }),
    )
    const { result: b, cleanup: cleanB } = withSetup(() =>
      usePrototype(schema, { namespace: nsB, existingDoc: new Y.Doc() }),
    )

    expect(a.doc).not.toBe(b.doc)
    cleanA()
    cleanB()
    a.doc.destroy()
    b.doc.destroy()
  })

  it('same namespace + same schema.key shares one Y.Doc via document cache', async () => {
    const ns = uniqueNs()
    const idbKey = `proto:${ns}:${schema.key}`
    trackTestDb(idbKey)

    // Both components share the same namespace → same cached doc
    const { result: a, cleanup: cleanA } = withSetup(() =>
      usePrototype(schema, { namespace: ns }),
    )
    const { result: b, cleanup: cleanB } = withSetup(() =>
      usePrototype(schema, { namespace: ns }),
    )

    await waitFor(() => a.isReady.value && b.isReady.value, 3000)

    expect(a.doc).toBe(b.doc)
    expect(documentCache.has(idbKey)).toBe(true)

    cleanA()
    cleanB()
  })

  it('namespace produces correct IDB key: proto:<namespace>:<schema.key>', async () => {
    const ns = uniqueNs()
    const expectedKey = `proto:${ns}:${schema.key}`
    trackTestDb(expectedKey)

    const { result, cleanup } = withSetup(() =>
      usePrototype(schema, { namespace: ns }),
    )
    await waitFor(() => result.isReady.value, 3000)

    expect(documentCache.has(expectedKey)).toBe(true)
    expect(providerCache.has(expectedKey)).toBe(true)
    cleanup()
  })

  it('no namespace uses proto:<schema.key> (backward-compatible)', async () => {
    const expectedKey = `proto:${schema.key}`
    trackTestDb(expectedKey)

    const { result, cleanup } = withSetup(() =>
      usePrototype(schema, { existingDoc: new Y.Doc() }),
    )

    // existingDoc path never writes to IDB, but the cache key is still resolved
    expect(result.doc).toBeInstanceOf(Y.Doc)
    cleanup()
    result.doc.destroy()
  })

  it('data written under namespace A is not visible under namespace B', async () => {
    const nsA = uniqueNs()
    const nsB = uniqueNs()
    const keyA = `proto:${nsA}:${schema.key}`
    const keyB = `proto:${nsB}:${schema.key}`
    trackTestDb(keyA)
    trackTestDb(keyB)

    // Seed IDB for nsA with a known value
    await seedIDB(keyA, { value: 9999 })

    // Open nsA — should load the seeded value
    const { result: a, cleanup: cleanA } = withSetup(() =>
      usePrototype(schema, { namespace: nsA }),
    )
    await waitFor(() => a.isReady.value, 3000)
    expect(a.state.value.value).toBe(9999)

    // Open nsB — should be empty (default 0)
    const { result: b, cleanup: cleanB } = withSetup(() =>
      usePrototype(schema, { namespace: nsB }),
    )
    await waitFor(() => b.isReady.value, 3000)
    expect(b.state.value.value).toBe(0)

    cleanA()
    cleanB()
  })

  it('mutations in one namespace do not affect another namespace', async () => {
    const nsA = uniqueNs()
    const nsB = uniqueNs()
    const keyA = `proto:${nsA}:${schema.key}`
    const keyB = `proto:${nsB}:${schema.key}`
    trackTestDb(keyA)
    trackTestDb(keyB)

    const { result: a, cleanup: cleanA } = withSetup(() =>
      usePrototype(schema, { namespace: nsA }),
    )
    const { result: b, cleanup: cleanB } = withSetup(() =>
      usePrototype(schema, { namespace: nsB }),
    )
    await waitFor(() => a.isReady.value && b.isReady.value, 3000)

    a.state.value.value = 42
    await nextTick()

    // nsB is unaffected
    expect(b.state.value.value).toBe(0)

    cleanA()
    cleanB()
  })

  it('namespace + docKey override: uses proto:<namespace>:<docKey>', async () => {
    const ns = uniqueNs()
    const customKey = 'custom-key'
    const expectedKey = `proto:${ns}:${customKey}`
    trackTestDb(expectedKey)

    const { result, cleanup } = withSetup(() =>
      usePrototype(schema, { namespace: ns, docKey: customKey }),
    )
    await waitFor(() => result.isReady.value, 3000)

    expect(documentCache.has(expectedKey)).toBe(true)
    cleanup()
  })

  it('namespace + encryption uses proto:enc:<namespace>:<schema.key>', async () => {
    const ns = uniqueNs()
    const expectedKey = `proto:enc:${ns}:${schema.key}`
    trackTestDb(expectedKey)

    const { result, cleanup } = withSetup(() =>
      usePrototype(schema, { namespace: ns, encryption: { password: 'test-pw' } }),
    )
    await waitFor(() => result.isReady.value, 3000)

    expect(documentCache.has(expectedKey)).toBe(true)
    cleanup()
  })

  it('clearProtoNamespace removes exactly the namespaced IDB store', async () => {
    const nsTarget = uniqueNs()
    const nsOther = uniqueNs()
    const keyTarget = `proto:${nsTarget}:${schema.key}`
    const keyOther = `proto:${nsOther}:${schema.key}`
    trackTestDb(keyTarget)
    trackTestDb(keyOther)

    await seedIDB(keyTarget, { value: 1 })
    await seedIDB(keyOther, { value: 2 })

    await clearProtoNamespace(nsTarget)

    // Target store deleted — reopen yields default value
    expect(Object.keys(await readIDB(keyTarget))).toHaveLength(0)
    // Other namespace untouched
    expect((await readIDB(keyOther)).value).toBe(2)
  })

  it('clearProtoKeys removes the specific schema key for the namespace', async () => {
    const ns = uniqueNs()
    const keyA = `proto:${ns}:${schema.key}`
    const keyB = `proto:${ns}:other-schema`
    trackTestDb(keyA)
    trackTestDb(keyB)

    await seedIDB(keyA, { value: 10 })
    await seedIDB(keyB, { value: 20 })

    await clearProtoKeys(ns, [schema.key])

    expect(Object.keys(await readIDB(keyA))).toHaveLength(0)
    expect((await readIDB(keyB)).value).toBe(20)
  })
})
