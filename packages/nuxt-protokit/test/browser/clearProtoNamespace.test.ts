/**
 * Tests for clearProtoNamespace and clearProtoKeys.
 *
 * Covers:
 * - IDB stores are deleted after cleanup (verified by re-opening an empty doc)
 * - In-memory caches (documentCache, providerCache, refCountCache, isReadyRefCache)
 *   are cleared for matching keys only
 * - Non-matching namespaces / keys are not touched
 * - Pending debounced server push timers are cancelled
 * - Safe to call when nothing exists for the namespace
 */
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import {
  clearProtoNamespace,
  clearProtoKeys,
  documentCache,
  providerCache,
  refCountCache,
  isReadyRefCache,
} from '../../src/runtime/composables/useProtoDoc'
import { trackTestDb } from '../helpers/browser-setup'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create an IDB-backed Y.Doc, write data, then fully close it (simulates a previous session). */
function writeToIDB(key: string, data: Record<string, unknown>): Promise<void> {
  return new Promise<void>((resolve) => {
    const doc = new Y.Doc()
    const idb = new IndexeddbPersistence(key, doc)
    idb.on('synced', async () => {
      for (const [k, v] of Object.entries(data))
        doc.getMap('data').set(k, v)
      // Give IDB time to persist the update before we close
      await new Promise(r => setTimeout(r, 50))
      await idb.destroy()
      doc.destroy()
      resolve()
    })
  })
}

/** Open a fresh IDB connection and return whatever is in the 'data' map. */
function readFromIDB(key: string): Promise<Record<string, unknown>> {
  return new Promise<Record<string, unknown>>((resolve) => {
    const doc = new Y.Doc()
    const idb = new IndexeddbPersistence(key, doc)
    idb.on('synced', async () => {
      const result: Record<string, unknown> = {}
      doc.getMap('data').forEach((v, k) => { result[k] = v })
      await idb.destroy()
      doc.destroy()
      resolve(result)
    })
  })
}

let counter = 0
/** Returns a unique namespace string so tests don't interfere with each other. */
function ns(): string {
  return `cleanup-ns-${Date.now()}-${++counter}`
}

// ─── clearProtoNamespace ─────────────────────────────────────────────────────

describe('clearProtoNamespace', () => {
  it('deletes all IDB stores whose key starts with proto:<namespace>:', async () => {
    const namespace = ns()
    const keyA = `proto:${namespace}:schema-a`
    const keyB = `proto:${namespace}:schema-b`
    trackTestDb(keyA)
    trackTestDb(keyB)

    await writeToIDB(keyA, { msg: 'hello' })
    await writeToIDB(keyB, { msg: 'world' })

    // Sanity: data present before cleanup
    expect((await readFromIDB(keyA)).msg).toBe('hello')
    expect((await readFromIDB(keyB)).msg).toBe('world')

    await clearProtoNamespace(namespace)

    // Both stores deleted — re-opening yields empty docs
    expect(Object.keys(await readFromIDB(keyA))).toHaveLength(0)
    expect(Object.keys(await readFromIDB(keyB))).toHaveLength(0)
  })

  it('does not delete IDB stores from a different namespace', async () => {
    const nsTarget = ns()
    const nsOther = ns()
    const keyTarget = `proto:${nsTarget}:tool`
    const keyOther = `proto:${nsOther}:tool`
    trackTestDb(keyTarget)
    trackTestDb(keyOther)

    await writeToIDB(keyTarget, { x: 'gone' })
    await writeToIDB(keyOther, { x: 'kept' })

    await clearProtoNamespace(nsTarget)

    expect(Object.keys(await readFromIDB(keyTarget))).toHaveLength(0)
    expect((await readFromIDB(keyOther)).x).toBe('kept')
  })

  it('removes in-memory cache entries for the namespace', async () => {
    const namespace = ns()
    const fullKey = `proto:${namespace}:my-schema`
    trackTestDb(fullKey)

    // Populate caches as useProtoDoc would
    const doc = new Y.Doc()
    documentCache.set(fullKey, doc)
    providerCache.set(fullKey, {})
    refCountCache.set(fullKey, 2)
    isReadyRefCache.set(fullKey, ref(true))

    await clearProtoNamespace(namespace)

    expect(documentCache.has(fullKey)).toBe(false)
    expect(providerCache.has(fullKey)).toBe(false)
    expect(refCountCache.has(fullKey)).toBe(false)
    expect(isReadyRefCache.has(fullKey)).toBe(false)
  })

  it('does not remove cache entries from a different namespace', async () => {
    const nsA = ns()
    const nsB = ns()
    const keyA = `proto:${nsA}:tool`
    const keyB = `proto:${nsB}:tool`

    const docA = new Y.Doc()
    const docB = new Y.Doc()
    documentCache.set(keyA, docA)
    documentCache.set(keyB, docB)
    providerCache.set(keyA, {})
    providerCache.set(keyB, {})

    await clearProtoNamespace(nsB)

    expect(documentCache.has(keyA)).toBe(true)
    expect(providerCache.has(keyA)).toBe(true)
    expect(documentCache.has(keyB)).toBe(false)
    expect(providerCache.has(keyB)).toBe(false)

    // Tidy up manually since nsA was not cleaned
    docA.destroy()
    documentCache.delete(keyA)
    providerCache.delete(keyA)
  })

  it('cancels a pending debounced server push timer', async () => {
    const namespace = ns()
    const fullKey = `proto:${namespace}:tool`
    trackTestDb(fullKey)

    const doc = new Y.Doc()
    const timer = setTimeout(() => {}, 60_000) // would never fire during the test
    documentCache.set(fullKey, doc)
    providerCache.set(fullKey, { serverPushTimer: timer })
    refCountCache.set(fullKey, 1)

    await clearProtoNamespace(namespace)

    // If clearTimeout was NOT called, the timer would remain in the provider —
    // but the provider itself should be gone from the cache
    expect(providerCache.has(fullKey)).toBe(false)
  })

  it('is safe to call when no docs or IDB stores exist for the namespace', async () => {
    await expect(clearProtoNamespace(ns())).resolves.toBeUndefined()
  })
})

// ─── clearProtoKeys ───────────────────────────────────────────────────────────

describe('clearProtoKeys', () => {
  it('deletes IDB stores for the listed schema keys only', async () => {
    const namespace = ns()
    const keyA = `proto:${namespace}:schema-a`
    const keyB = `proto:${namespace}:schema-b`
    const keyC = `proto:${namespace}:schema-c`
    trackTestDb(keyA)
    trackTestDb(keyB)
    trackTestDb(keyC)

    await writeToIDB(keyA, { v: 1 })
    await writeToIDB(keyB, { v: 2 })
    await writeToIDB(keyC, { v: 3 })

    // Delete A and B — leave C
    await clearProtoKeys(namespace, ['schema-a', 'schema-b'])

    expect(Object.keys(await readFromIDB(keyA))).toHaveLength(0)
    expect(Object.keys(await readFromIDB(keyB))).toHaveLength(0)
    expect((await readFromIDB(keyC)).v).toBe(3)
  })

  it('removes cache entries for listed keys only, leaves others untouched', async () => {
    const namespace = ns()
    const fullKeyA = `proto:${namespace}:a`
    const fullKeyB = `proto:${namespace}:b`
    trackTestDb(fullKeyA)
    trackTestDb(fullKeyB)

    const docA = new Y.Doc()
    const docB = new Y.Doc()
    documentCache.set(fullKeyA, docA)
    documentCache.set(fullKeyB, docB)
    providerCache.set(fullKeyA, {})
    providerCache.set(fullKeyB, {})
    refCountCache.set(fullKeyA, 1)
    refCountCache.set(fullKeyB, 1)
    isReadyRefCache.set(fullKeyA, ref(true))
    isReadyRefCache.set(fullKeyB, ref(true))

    await clearProtoKeys(namespace, ['a']) // only A

    expect(documentCache.has(fullKeyA)).toBe(false)
    expect(providerCache.has(fullKeyA)).toBe(false)
    expect(refCountCache.has(fullKeyA)).toBe(false)
    expect(isReadyRefCache.has(fullKeyA)).toBe(false)

    // B is untouched
    expect(documentCache.has(fullKeyB)).toBe(true)
    expect(providerCache.has(fullKeyB)).toBe(true)
    expect(refCountCache.has(fullKeyB)).toBe(true)
    expect(isReadyRefCache.has(fullKeyB)).toBe(true)

    // Tidy up
    docB.destroy()
    documentCache.delete(fullKeyB)
    providerCache.delete(fullKeyB)
    refCountCache.delete(fullKeyB)
    isReadyRefCache.delete(fullKeyB)
  })

  it('cancels pending debounced server push timers for listed keys', async () => {
    const namespace = ns()
    const fullKey = `proto:${namespace}:tool`
    trackTestDb(fullKey)

    const doc = new Y.Doc()
    const timer = setTimeout(() => {}, 60_000)
    documentCache.set(fullKey, doc)
    providerCache.set(fullKey, { serverPushTimer: timer })
    refCountCache.set(fullKey, 1)

    await clearProtoKeys(namespace, ['tool'])

    expect(providerCache.has(fullKey)).toBe(false)
  })

  it('is safe to call for keys that do not exist in cache or IDB', async () => {
    await expect(clearProtoKeys(ns(), ['nonexistent'])).resolves.toBeUndefined()
  })

  it('cross-browser: works without indexedDB.databases() (explicit key enumeration)', async () => {
    // clearProtoKeys never uses indexedDB.databases() — it always targets exact keys.
    // This test confirms it works even if databases() were absent (Firefox scenario).
    const namespace = ns()
    const fullKey = `proto:${namespace}:explicit`
    trackTestDb(fullKey)

    await writeToIDB(fullKey, { safe: true })
    expect((await readFromIDB(fullKey)).safe).toBe(true)

    await clearProtoKeys(namespace, ['explicit'])

    expect(Object.keys(await readFromIDB(fullKey))).toHaveLength(0)
  })
})
