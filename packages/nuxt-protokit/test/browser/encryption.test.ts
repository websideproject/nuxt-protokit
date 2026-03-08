/**
 * Tests for AES-GCM encryption utilities and EncryptedIdbPersistence.
 *
 * Covers:
 * - Pure crypto functions (generateSalt, deriveKey, encryptBytes, decryptBytes)
 * - EncryptedIdbPersistence: persist → reload with correct password → data present
 * - EncryptedIdbPersistence: wrong password → data not readable
 * - EncryptedIdbPersistence: raw IDB value is not plaintext Y.js binary
 * - EncryptedIdbPersistence: compaction (>50 updates collapses to 1)
 * - EncryptedIdbPersistence: destroy cleans up listeners
 * - clearProtoNamespace/clearProtoKeys remove proto:enc: databases
 */
import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import {
  generateSalt,
  deriveKey,
  encryptBytes,
  decryptBytes,
  importRawKey,
} from '../../src/runtime/utils/encryption'
import { EncryptedIdbPersistence } from '../../src/runtime/composables/useEncryptedIdb'
import {
  clearProtoNamespace,
  clearProtoKeys,
  documentCache,
  providerCache,
} from '../../src/runtime/composables/useProtoDoc'
import { trackTestDb } from '../helpers/browser-setup'

// ─── Helpers ─────────────────────────────────────────────────────────────────

let counter = 0
function dbName(): string {
  return `proto:enc:enc-test-${Date.now()}-${++counter}`
}

function createEncryptedDoc(name: string, password: string): {
  doc: Y.Doc
  provider: EncryptedIdbPersistence
} {
  const doc = new Y.Doc()
  const provider = new EncryptedIdbPersistence(name, doc, { password })
  return { doc, provider }
}

// ─── Pure crypto utilities ────────────────────────────────────────────────────

describe('encryption utilities', () => {
  it('generateSalt returns 16 bytes', () => {
    const salt = generateSalt()
    expect(salt).toBeInstanceOf(Uint8Array)
    expect(salt.byteLength).toBe(16)
  })

  it('generateSalt produces different values each call', () => {
    const a = generateSalt()
    const b = generateSalt()
    expect(Array.from(a)).not.toEqual(Array.from(b))
  })

  it('deriveKey returns a CryptoKey', async () => {
    const salt = generateSalt()
    const key = await deriveKey('my-password', salt)
    expect(key).toBeInstanceOf(CryptoKey)
    expect(key.algorithm.name).toBe('AES-GCM')
  })

  it('same password + salt produces the same key (deterministic)', async () => {
    const salt = generateSalt()
    const keyA = await deriveKey('secret', salt)
    const keyB = await deriveKey('secret', salt)
    // Encrypt with A, decrypt with B — should succeed
    const plain = new Uint8Array([1, 2, 3, 4, 5])
    const encrypted = await encryptBytes(keyA, plain)
    const decrypted = await decryptBytes(keyB, encrypted)
    expect(Array.from(decrypted)).toEqual(Array.from(plain))
  })

  it('importRawKey accepts 32-byte key and returns a CryptoKey', async () => {
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    const key = await importRawKey(rawKey)
    expect(key).toBeInstanceOf(CryptoKey)
  })

  it('encryptBytes → decryptBytes round-trips correctly', async () => {
    const key = await deriveKey('test', generateSalt())
    const plain = new TextEncoder().encode('hello world')
    const encrypted = await encryptBytes(key, plain)
    const decrypted = await decryptBytes(key, encrypted)
    expect(new TextDecoder().decode(decrypted)).toBe('hello world')
  })

  it('encryptBytes produces different ciphertext on each call (random IV)', async () => {
    const key = await deriveKey('test', generateSalt())
    const plain = new Uint8Array([42, 43, 44])
    const a = await encryptBytes(key, plain)
    const b = await encryptBytes(key, plain)
    expect(Array.from(new Uint8Array(a))).not.toEqual(Array.from(new Uint8Array(b)))
  })

  it('decryptBytes throws with the wrong key (AES-GCM authentication)', async () => {
    const salt = generateSalt()
    const keyA = await deriveKey('password-a', salt)
    const keyB = await deriveKey('password-b', salt)
    const encrypted = await encryptBytes(keyA, new Uint8Array([1, 2, 3]))
    await expect(decryptBytes(keyB, encrypted)).rejects.toThrow()
  })

  it('decryptBytes throws when ciphertext is tampered with', async () => {
    const key = await deriveKey('test', generateSalt())
    const encrypted = new Uint8Array(await encryptBytes(key, new Uint8Array([10, 20, 30])))
    encrypted[20] ^= 0xff // flip a byte in the ciphertext
    await expect(decryptBytes(key, encrypted.buffer)).rejects.toThrow()
  })
})

// ─── EncryptedIdbPersistence ──────────────────────────────────────────────────

describe('EncryptedIdbPersistence', () => {
  it('data persists: write → destroy → reopen with same password → data present', async () => {
    const name = dbName()
    trackTestDb(name)

    // Session 1: write
    const s1 = createEncryptedDoc(name, 'correct-password')
    await s1.provider.whenSynced
    s1.doc.getMap('fields').set('revenue', 42000)
    await new Promise(r => setTimeout(r, 50)) // let the update persist
    await s1.provider.destroy()
    s1.doc.destroy()

    // Session 2: reload
    const s2 = createEncryptedDoc(name, 'correct-password')
    await s2.provider.whenSynced
    expect(s2.doc.getMap('fields').get('revenue')).toBe(42000)
    await s2.provider.destroy()
    s2.doc.destroy()
  })

  it('wrong password: data is not readable — doc loads empty', async () => {
    const name = dbName()
    trackTestDb(name)

    // Write with correct password
    const s1 = createEncryptedDoc(name, 'correct-password')
    await s1.provider.whenSynced
    s1.doc.getMap('fields').set('secret', 'classified')
    await new Promise(r => setTimeout(r, 50))
    await s1.provider.destroy()
    s1.doc.destroy()

    // Attempt to load with wrong password
    const s2 = createEncryptedDoc(name, 'wrong-password')
    await s2.provider.whenSynced
    // The update cannot be decrypted — doc should be empty (default Y.Doc state)
    expect(s2.doc.getMap('fields').get('secret')).toBeUndefined()
    await s2.provider.destroy()
    s2.doc.destroy()
  })

  it('raw IDB blob is not plaintext Y.js binary', async () => {
    const name = dbName()
    trackTestDb(name)

    const s1 = createEncryptedDoc(name, 'password')
    await s1.provider.whenSynced
    s1.doc.getMap('fields').set('value', 99)
    await new Promise(r => setTimeout(r, 50))

    // Read what's actually stored in IDB
    const rawBlobs = await new Promise<ArrayBuffer[]>((resolve, reject) => {
      const req = indexedDB.open(name)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('updates', 'readonly')
        const getAll = tx.objectStore('updates').getAll()
        getAll.onsuccess = () => {
          resolve(getAll.result as ArrayBuffer[])
          db.close()
        }
        getAll.onerror = () => reject(getAll.error)
      }
      req.onerror = () => reject(req.error)
    })

    expect(rawBlobs.length).toBeGreaterThan(0)

    // Encode the same value with plain Y.js to compare
    const plainDoc = new Y.Doc()
    plainDoc.getMap('fields').set('value', 99)
    const plainUpdate = Y.encodeStateAsUpdate(plainDoc)
    plainDoc.destroy()

    // The raw IDB blob should NOT equal the plain Y.js update (it's encrypted)
    const firstBlob = new Uint8Array(rawBlobs[0]!)
    expect(Array.from(firstBlob)).not.toEqual(Array.from(plainUpdate))

    await s1.provider.destroy()
    s1.doc.destroy()
  })

  it('CryptoKey mode: accepts a pre-derived key instead of password', async () => {
    const name = dbName()
    trackTestDb(name)

    const key = await deriveKey('my-app-secret', generateSalt())

    const doc1 = new Y.Doc()
    const p1 = new EncryptedIdbPersistence(name, doc1, { key })
    await p1.whenSynced
    doc1.getMap('data').set('x', 'from-key-mode')
    await new Promise(r => setTimeout(r, 50))
    await p1.destroy()
    doc1.destroy()

    const doc2 = new Y.Doc()
    const p2 = new EncryptedIdbPersistence(name, doc2, { key })
    await p2.whenSynced
    expect(doc2.getMap('data').get('x')).toBe('from-key-mode')
    await p2.destroy()
    doc2.destroy()
  })

  it('compaction: >50 updates collapse to a single blob', async () => {
    const name = dbName()
    trackTestDb(name)

    const s1 = createEncryptedDoc(name, 'compact-test')
    await s1.provider.whenSynced

    // Write 55 updates — exceeds the compact threshold of 50
    for (let i = 0; i < 55; i++) {
      s1.doc.getMap('fields').set('counter', i)
      await new Promise(r => setTimeout(r, 5))
    }
    await s1.provider.destroy()
    s1.doc.destroy()

    // Reopen to trigger compaction on load (>50 blobs → compact to 1)
    const s2 = createEncryptedDoc(name, 'compact-test')
    await s2.provider.whenSynced
    expect(s2.doc.getMap('fields').get('counter')).toBe(54) // last written value

    // After a round-trip the store should be compacted
    const blobCount = await new Promise<number>((resolve, reject) => {
      const req = indexedDB.open(name)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('updates', 'readonly')
        const countReq = tx.objectStore('updates').count()
        countReq.onsuccess = () => { resolve(countReq.result); db.close() }
        countReq.onerror = () => reject(countReq.error)
      }
      req.onerror = () => reject(req.error)
    })
    expect(blobCount).toBe(1)

    await s2.provider.destroy()
    s2.doc.destroy()
  })

  it('destroy stops persisting new updates', async () => {
    const name = dbName()
    trackTestDb(name)

    const s1 = createEncryptedDoc(name, 'destroy-test')
    await s1.provider.whenSynced
    s1.doc.getMap('data').set('before', true)
    await new Promise(r => setTimeout(r, 50))
    await s1.provider.destroy() // stop listening

    // Write AFTER destroy — should not be persisted
    s1.doc.getMap('data').set('after', true)
    await new Promise(r => setTimeout(r, 50))
    s1.doc.destroy()

    // Reload — 'after' should not be there
    const s2 = createEncryptedDoc(name, 'destroy-test')
    await s2.provider.whenSynced
    expect(s2.doc.getMap('data').get('before')).toBe(true)
    expect(s2.doc.getMap('data').get('after')).toBeUndefined()
    await s2.provider.destroy()
    s2.doc.destroy()
  })
})

// ─── Cleanup utilities cover encrypted stores ─────────────────────────────────

describe('clearProtoNamespace removes proto:enc: databases', () => {
  it('deletes encrypted IDB stores for the namespace', async () => {
    const namespace = `enc-ns-${Date.now()}`
    const encKey = `proto:enc:${namespace}:tool`
    trackTestDb(encKey)

    // Create an encrypted doc (creates the IDB database)
    const doc = new Y.Doc()
    const p = new EncryptedIdbPersistence(encKey, doc, { password: 'pw' })
    await p.whenSynced
    doc.getMap('data').set('x', 1)
    await new Promise(r => setTimeout(r, 50))
    await p.destroy()
    doc.destroy()

    // Populate in-memory cache to simulate useProtoDoc state
    const freshDoc = new Y.Doc()
    documentCache.set(encKey, freshDoc)
    providerCache.set(encKey, {})

    await clearProtoNamespace(namespace)

    expect(documentCache.has(encKey)).toBe(false)
    expect(providerCache.has(encKey)).toBe(false)

    // IDB should be gone — reopen yields empty doc
    const verify = new Y.Doc()
    const vp = new EncryptedIdbPersistence(encKey, verify, { password: 'pw' })
    await vp.whenSynced
    expect(verify.getMap('data').get('x')).toBeUndefined()
    await vp.destroy()
    verify.destroy()
  })
})

describe('clearProtoKeys removes proto:enc: databases', () => {
  it('deletes encrypted IDB store for the listed key', async () => {
    const namespace = `enc-keys-ns-${Date.now()}`
    const encKey = `proto:enc:${namespace}:my-schema`
    trackTestDb(encKey)

    const doc = new Y.Doc()
    const p = new EncryptedIdbPersistence(encKey, doc, { password: 'pw' })
    await p.whenSynced
    doc.getMap('data').set('y', 2)
    await new Promise(r => setTimeout(r, 50))
    await p.destroy()
    doc.destroy()

    await clearProtoKeys(namespace, ['my-schema'])

    // IDB should be gone
    const verify = new Y.Doc()
    const vp = new EncryptedIdbPersistence(encKey, verify, { password: 'pw' })
    await vp.whenSynced
    expect(verify.getMap('data').get('y')).toBeUndefined()
    await vp.destroy()
    verify.destroy()
  })
})
