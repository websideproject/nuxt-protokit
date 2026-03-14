/**
 * EncryptedIdbPersistence — a drop-in replacement for IndexeddbPersistence
 * that encrypts every Y.js update with AES-GCM before writing to IndexedDB.
 *
 * IDB schema (database name = docKey):
 *   'updates' store  — autoIncrement, values are encrypted ArrayBuffers ([IV][ciphertext])
 *   'meta'    store  — keyPath 'k', holds { k: 'salt', v: ArrayBuffer } for password-derived keys
 *
 * Compaction: when the stored update count reaches COMPACT_THRESHOLD, all updates are replaced
 * with a single encrypted full-state snapshot. This keeps the database size bounded.
 *
 * Thread safety: this composable is single-writer per document instance; concurrent tabs
 * are handled via BroadcastChannel at the useProtoDoc layer, not here.
 */
import * as Y from 'yjs'
import { deriveKey, generateSalt, encryptBytes, decryptBytes } from '../utils/encryption'

const UPDATES_STORE = 'updates'
const META_STORE = 'meta'
const COMPACT_THRESHOLD = 50

/** Config accepted by EncryptedIdbPersistence. Supply either a password or a pre-derived CryptoKey. */
export type EncryptionConfig
  = | { password: string, key?: never }
    | { key: CryptoKey, password?: never }

export class EncryptedIdbPersistence {
  private db: IDBDatabase | null = null
  private cryptoKey: CryptoKey | null = null
  private updateListener: ((update: Uint8Array, origin: unknown) => void) | null = null
  private _synced = false

  readonly whenSynced: Promise<void>
  private _resolveSync!: () => void
  private _rejectSync!: (err: Error) => void

  constructor(
    private readonly dbName: string,
    private readonly doc: Y.Doc,
    private readonly config: EncryptionConfig,
  ) {
    this.whenSynced = new Promise<void>((resolve, reject) => {
      this._resolveSync = resolve
      this._rejectSync = reject
    })
    this._init()
  }

  get synced(): boolean { return this._synced }

  // ── Internal init ──────────────────────────────────────────────────────────

  private async _init(): Promise<void> {
    try {
      this.db = await this._openDB()
      this.cryptoKey = await this._resolveKey()

      const blobs = await this._getAllBlobs()
      if (blobs.length > 0) {
        const updates: Uint8Array[] = []
        for (const blob of blobs) {
          try {
            updates.push(await decryptBytes(this.cryptoKey, blob))
          }
          catch {
            // Wrong key or corrupted blob — skip silently; the rest may still apply
            console.warn(`[EncryptedIdb] Skipping undecryptable update in "${this.dbName}"`)
          }
        }
        if (updates.length > 0) {
          Y.transact(this.doc, () => {
            for (const u of updates) {
              try { Y.applyUpdate(this.doc, u) }
              catch {}
            }
          }, 'encrypted-idb')
        }
        if (blobs.length >= COMPACT_THRESHOLD) {
          await this._compact()
        }
      }

      this.updateListener = (update: Uint8Array, origin: unknown) => {
        if (origin === 'encrypted-idb') return
        this._storeUpdate(update)
      }
      this.doc.on('update', this.updateListener)

      this._synced = true
      this._resolveSync()
    }
    catch (err) {
      this._rejectSync(err instanceof Error ? err : new Error(String(err)))
    }
  }

  private _openDB(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1)
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(UPDATES_STORE))
          db.createObjectStore(UPDATES_STORE, { autoIncrement: true })
        if (!db.objectStoreNames.contains(META_STORE))
          db.createObjectStore(META_STORE, { keyPath: 'k' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  private async _resolveKey(): Promise<CryptoKey> {
    if (this.config.key) return this.config.key
    let salt = await this._readSalt()
    if (!salt) {
      salt = generateSalt()
      await this._writeSalt(salt)
    }
    return deriveKey(this.config.password, salt)
  }

  private _readSalt(): Promise<Uint8Array | null> {
    return new Promise<Uint8Array | null>((resolve, reject) => {
      const tx = this.db!.transaction(META_STORE, 'readonly')
      const req = tx.objectStore(META_STORE).get('salt')
      req.onsuccess = () => {
        const row = req.result as { k: string, v: ArrayBuffer } | undefined
        resolve(row ? new Uint8Array(row.v) : null)
      }
      req.onerror = () => reject(req.error)
    })
  }

  private _writeSalt(salt: Uint8Array): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(META_STORE, 'readwrite')
      tx.objectStore(META_STORE).put({ k: 'salt', v: salt.buffer })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  private _getAllBlobs(): Promise<ArrayBuffer[]> {
    return new Promise<ArrayBuffer[]>((resolve, reject) => {
      const tx = this.db!.transaction(UPDATES_STORE, 'readonly')
      const req = tx.objectStore(UPDATES_STORE).getAll()
      req.onsuccess = () => resolve(req.result as ArrayBuffer[])
      req.onerror = () => reject(req.error)
    })
  }

  private async _storeUpdate(update: Uint8Array): Promise<void> {
    if (!this.db || !this.cryptoKey) return
    try {
      const encrypted = await encryptBytes(this.cryptoKey, update)
      await new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction(UPDATES_STORE, 'readwrite')
        tx.objectStore(UPDATES_STORE).add(encrypted)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    }
    catch (err) {
      console.warn(`[EncryptedIdb] Failed to store update for "${this.dbName}":`, err)
    }
  }

  private async _compact(): Promise<void> {
    if (!this.db || !this.cryptoKey) return
    try {
      const fullState = Y.encodeStateAsUpdate(this.doc)
      const encrypted = await encryptBytes(this.cryptoKey, fullState)
      await new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction(UPDATES_STORE, 'readwrite')
        const store = tx.objectStore(UPDATES_STORE)
        store.clear()
        store.add(encrypted)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    }
    catch (err) {
      console.warn(`[EncryptedIdb] Compaction failed for "${this.dbName}":`, err)
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async destroy(): Promise<void> {
    if (this.updateListener) {
      this.doc.off('update', this.updateListener)
      this.updateListener = null
    }
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}
