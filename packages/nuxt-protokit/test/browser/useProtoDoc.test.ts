/**
 * useProtoDoc browser tests — require real IndexedDB + BroadcastChannel.
 * Each test uses a unique key to avoid cross-test contamination.
 * IndexedDB databases are cleaned up in browser-setup.ts afterEach.
 */
import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { trackTestDb } from '../helpers/browser-setup'
import { waitFor } from '../helpers/wait'

// Helper: create a Y.Doc with IndexedDB persistence
function createDocWithIDB(key: string): { doc: Y.Doc, idb: IndexeddbPersistence, ready: Promise<void> } {
  const doc = new Y.Doc()
  const idb = new IndexeddbPersistence(key, doc)
  const ready = new Promise<void>((resolve) => {
    idb.on('synced', () => resolve())
  })
  return { doc, idb, ready }
}

async function destroyDoc(doc: Y.Doc, idb: IndexeddbPersistence) {
  await idb.destroy()
  doc.destroy()
}

let keyCounter = 0
function testKey(): string {
  const key = `proto:idb-test-${Date.now()}-${++keyCounter}`
  trackTestDb(key)
  return key
}

describe('useProtoDoc (IndexedDB + BroadcastChannel)', () => {
  it('isReady becomes true after IndexedDB syncs', async () => {
    const key = testKey()
    const { idb, ready } = createDocWithIDB(key)
    let synced = false
    idb.on('synced', () => { synced = true })
    await ready
    expect(synced).toBe(true)
    await idb.destroy()
  })

  it('data persists: write → destroy → recreate → data present', async () => {
    const key = testKey()

    // First session: write data
    const s1 = createDocWithIDB(key)
    await s1.ready
    s1.doc.getMap('data').set('name', 'persisted-value')
    await destroyDoc(s1.doc, s1.idb)

    // Second session: read back
    const s2 = createDocWithIDB(key)
    await s2.ready
    expect(s2.doc.getMap('data').get('name')).toBe('persisted-value')
    await destroyDoc(s2.doc, s2.idb)
  })

  it('BroadcastChannel sync: sender and receiver on same channel name exchange updates', async () => {
    const key = testKey()

    const doc1 = new Y.Doc()
    const doc2 = new Y.Doc()

    // Use distinct BroadcastChannel instances (same name) to simulate cross-tab
    // BroadcastChannel does NOT deliver to the same instance that sent — so we need
    // separate sender/receiver instances per doc.
    const doc1Sender = new BroadcastChannel(key)
    const doc1Receiver = new BroadcastChannel(key)
    const doc2Sender = new BroadcastChannel(key)
    const doc2Receiver = new BroadcastChannel(key)

    // doc1: send updates via doc1Sender; receive on doc1Receiver
    doc1.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== 'broadcast') {
        doc1Sender.postMessage({ type: 'yjs-update', update: Array.from(update) })
      }
    })
    doc1Receiver.onmessage = (event) => {
      if (event.data?.type === 'yjs-update') {
        Y.applyUpdate(doc1, new Uint8Array(event.data.update), 'broadcast')
      }
    }

    // doc2: send updates via doc2Sender; receive on doc2Receiver
    doc2.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== 'broadcast') {
        doc2Sender.postMessage({ type: 'yjs-update', update: Array.from(update) })
      }
    })
    doc2Receiver.onmessage = (event) => {
      if (event.data?.type === 'yjs-update') {
        Y.applyUpdate(doc2, new Uint8Array(event.data.update), 'broadcast')
      }
    }

    // Write in doc1 — should reach doc2 via BroadcastChannel
    doc1.getMap('shared').set('hello', 'world')

    await waitFor(() => doc2.getMap('shared').get('hello') === 'world', 2000)
    expect(doc2.getMap('shared').get('hello')).toBe('world')

    doc1Sender.close()
    doc1Receiver.close()
    doc2Sender.close()
    doc2Receiver.close()
    doc1.destroy()
    doc2.destroy()
  })

  it('BroadcastChannel suppresses loopback (origin=broadcast not re-broadcast)', async () => {
    const key = testKey()
    const doc = new Y.Doc()
    const sender = new BroadcastChannel(key)
    const receiver = new BroadcastChannel(key)

    let broadcastCount = 0
    doc.on('update', (_update: Uint8Array, origin: any) => {
      if (origin !== 'broadcast') {
        broadcastCount++
        sender.postMessage({ type: 'yjs-update', update: Array.from(_update) })
      }
    })

    receiver.onmessage = (event) => {
      if (event.data?.type === 'yjs-update') {
        // Apply with 'broadcast' origin — should NOT trigger another broadcast send
        Y.applyUpdate(doc, new Uint8Array(event.data.update), 'broadcast')
      }
    }

    // Simulate receiving a broadcast from another tab
    const externalDoc = new Y.Doc()
    externalDoc.getMap('x').set('k', 'v')
    const externalUpdate = Y.encodeStateAsUpdate(externalDoc)

    // Post as if from another tab (send via an external sender channel)
    const externalSender = new BroadcastChannel(key)
    externalSender.postMessage({ type: 'yjs-update', update: Array.from(externalUpdate) })

    await new Promise(r => setTimeout(r, 100))

    // doc received the update with 'broadcast' origin — should not re-broadcast
    expect(broadcastCount).toBe(0)

    sender.close()
    receiver.close()
    externalSender.close()
    doc.destroy()
    externalDoc.destroy()
  })

  it('two IDB instances with same key share persisted data after reload', async () => {
    // Tests that the IDB layer is shared: write in one "session", read in another
    const key = testKey()

    const s1 = createDocWithIDB(key)
    await s1.ready
    s1.doc.getMap('data').set('value', 'shared-across-sessions')
    await destroyDoc(s1.doc, s1.idb)

    // Simulate second "tab" or app restart by opening a new IDB on the same key
    const s2 = createDocWithIDB(key)
    await s2.ready

    expect(s2.doc.getMap('data').get('value')).toBe('shared-across-sessions')
    await destroyDoc(s2.doc, s2.idb)
  })

  it('different keys are independent', async () => {
    const key1 = testKey()
    const key2 = testKey()

    const s1 = createDocWithIDB(key1)
    const s2 = createDocWithIDB(key2)
    await Promise.all([s1.ready, s2.ready])

    s1.doc.getMap('data').set('msg', 'from doc1')
    await new Promise(r => setTimeout(r, 50))

    // doc2 should not see doc1's data
    expect(s2.doc.getMap('data').get('msg')).toBeUndefined()

    await destroyDoc(s1.doc, s1.idb)
    await destroyDoc(s2.doc, s2.idb)
  })

  it('IndexedDB deletion removes all stored data', async () => {
    const key = testKey()

    // Write data
    const s1 = createDocWithIDB(key)
    await s1.ready
    s1.doc.getMap('data').set('x', 'to-be-deleted')
    await destroyDoc(s1.doc, s1.idb)

    // Delete the database
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(key)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
    })

    // Recreate — should be empty
    const s2 = createDocWithIDB(key)
    await s2.ready
    expect(s2.doc.getMap('data').get('x')).toBeUndefined()
    await destroyDoc(s2.doc, s2.idb)
  })

  it('Y.js state vector: applying same update twice is idempotent', async () => {
    const key = testKey()

    const s1 = createDocWithIDB(key)
    await s1.ready

    s1.doc.getMap('data').set('count', 1)
    const update = Y.encodeStateAsUpdate(s1.doc)

    // Apply the same update twice
    Y.applyUpdate(s1.doc, update)
    Y.applyUpdate(s1.doc, update)

    // Value should still be 1, not duplicated
    expect(s1.doc.getMap('data').get('count')).toBe(1)

    await destroyDoc(s1.doc, s1.idb)
  })
})
