import { ref, onUnmounted, type Ref } from 'vue'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { useProtoCorruption } from './useProtoCorruption'

// Document cache to prevent duplicates across components
export const documentCache = new Map<string, Y.Doc>()
export const providerCache = new Map<string, {
  indexeddb?: IndexeddbPersistence
  broadcast?: BroadcastChannel
  // Stored so we can remove it on destroy or successful sync
  idbErrorHandler?: (e: PromiseRejectionEvent) => void
  // Debounce timer for server push
  serverPushTimer?: ReturnType<typeof setTimeout>
  // Stable client ID for this doc (sent with sync pushes)
  clientId?: string
}>()
export const refCountCache = new Map<string, number>()
// Shared isReady ref per doc key — all callers with the same key share one ref
export const isReadyRefCache = new Map<string, Ref<boolean>>()

// ─── Base64 helpers (same as CloudSyncProvider) ──────────────────────────────

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ─── Server sync helpers ─────────────────────────────────────────────────────

/**
 * Push the full document state to the server so the snapshot service
 * has something to snapshot. Silently no-ops if unauthenticated or offline.
 * No-ops entirely when serverSync is disabled.
 */
async function pushDocToServer(fullKey: string, doc: Y.Doc, clientId: string, base: string): Promise<void> {
  try {
    const fullState = Y.encodeStateAsUpdate(doc)
    if (fullState.length <= 1) return // nothing to push
    await $fetch(`${base}/sync`, {
      method: 'POST',
      body: {
        docKey: fullKey,
        docType: 'custom',
        updates: [{ update: uint8ArrayToBase64(fullState), timestamp: Date.now() }],
        clientId,
      },
    })
  }
  catch {
    // Silently ignore: user not authenticated, server offline, etc.
  }
}

/**
 * Create a server-side snapshot after a successful push.
 * The snapshot service deduplicates if the state hasn't changed.
 * No-ops entirely when serverSync is disabled.
 */
async function createServerSnapshot(fullKey: string, base: string): Promise<void> {
  try {
    await $fetch(`${base}/snapshots/create`, {
      method: 'POST',
      body: { docKey: fullKey },
    })
  }
  catch {
    // Silently ignore
  }
}

/**
 * Pull the full document state from the server and apply it to `doc`.
 * Pass an empty state vector to get everything the server has.
 * No-ops entirely when serverSync is disabled.
 */
async function pullFromServer(fullKey: string, doc: Y.Doc, base: string): Promise<void> {
  try {
    // Empty Y.Doc state vector = ask server for all updates from the beginning
    const emptyStateVector = Y.encodeStateVector(new Y.Doc())
    const res = await $fetch<{
      success: boolean
      data?: { updates: Array<{ update: string, timestamp: number }>, hasMore: boolean }
      error?: string
    }>(`${base}/pull`, {
      method: 'GET',
      query: {
        docKey: fullKey,
        stateVector: uint8ArrayToBase64(emptyStateVector),
        limit: 200,
      },
    })
    if (res.success && res.data?.updates?.length) {
      for (const u of res.data.updates) {
        const bytes = base64ToUint8Array(u.update)
        // Validate against a throwaway doc before applying to the live doc.
        // Prevents a corrupt server update from partially modifying local state.
        const testDoc = new Y.Doc()
        let valid = true
        try { Y.applyUpdate(testDoc, bytes) }
        catch { valid = false }
        testDoc.destroy()
        if (!valid) {
          console.warn(`[useProtoDoc] Skipping invalid Y.js update from server for "${fullKey}"`)
          continue
        }
        try { Y.applyUpdate(doc, bytes) }
        catch {}
      }
    }
  }
  catch {
    // Silently ignore: server unreachable, 404 (doc doesn't exist yet), auth error, etc.
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export interface UseProtoDocReturn {
  doc: Y.Doc
  isReady: Ref<boolean>
  destroy: () => void
}

/**
 * Create or retrieve a Y.js document with IndexedDB persistence and BroadcastChannel tab sync.
 * Reference-counted: multiple calls with the same key share one doc.
 *
 * After each successful IndexedDB sync, the doc state is pushed to the server and a server-side
 * snapshot is created (when serverSync is enabled in module config). Doc updates are debounced
 * and pushed to the server every 30 s.
 *
 * On IndexedDB corruption (y-indexeddb "Unexpected case" floating rejection):
 * - Queries the server for the latest snapshot (if any; skipped when serverSync is disabled)
 * - Shows ProtoCorruptionModal to let the user choose Restore or Start Fresh
 * - On Restore: restores the snapshot on the server, pulls the restored state to the client,
 *   then re-creates a fresh local IndexedDB
 * - On Fresh: creates a fresh local IndexedDB with the current (partial) in-memory state
 */
export function useProtoDoc(
  docKey: string,
  options?: {
    enableIndexedDB?: boolean
    enableBroadcast?: boolean
    skipAutoCleanup?: boolean
    /**
     * Force this document to be local-only, regardless of the global
     * `protokit.serverSync` config. Useful for public demo tools or
     * scratch pads that should never touch the server.
     */
    disableSync?: boolean
  },
): UseProtoDocReturn {
  const {
    enableIndexedDB = true,
    enableBroadcast = true,
    skipAutoCleanup = false,
    disableSync = false,
  } = options ?? {}

  // Read server sync config — only call during setup (composable context).
  // Per-doc disableSync overrides the global enabled flag.
  const { serverSync } = useProtoKitConfig()
  const syncEnabled = !disableSync && serverSync.enabled
  const syncBase = serverSync.baseUrl

  const fullKey = `proto:${docKey}`
  let doc: Y.Doc

  if (documentCache.has(fullKey)) {
    doc = documentCache.get(fullKey)!
    refCountCache.set(fullKey, (refCountCache.get(fullKey) || 0) + 1)
  }
  else {
    doc = new Y.Doc()
    documentCache.set(fullKey, doc)
    refCountCache.set(fullKey, 1)
    providerCache.set(fullKey, {})
  }

  const providers = providerCache.get(fullKey)!

  // Stable client ID for server push deduplication
  if (!providers.clientId) {
    providers.clientId = `proto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }

  // Shared isReady ref — all callers with the same key see the same ref
  if (!isReadyRefCache.has(fullKey)) {
    isReadyRefCache.set(fullKey, ref(false))
  }
  const isReady = isReadyRefCache.get(fullKey)!

  // ── IndexedDB persistence ──────────────────────────────────────────────────
  if (enableIndexedDB && !providers.indexeddb && import.meta.client) {
    const idbProvider = new IndexeddbPersistence(fullKey, doc)
    providers.indexeddb = idbProvider

    idbProvider.on('synced', () => {
      isReady.value = true
      if (providers.idbErrorHandler) {
        window.removeEventListener('unhandledrejection', providers.idbErrorHandler)
        providers.idbErrorHandler = undefined
      }
      // Push to server + create snapshot after a clean local load (fire and forget)
      if (import.meta.client && syncEnabled) {
        pushDocToServer(fullKey, doc, providers.clientId!, syncBase).then(() =>
          createServerSnapshot(fullKey, syncBase),
        )
      }
    })

    // Debounced server push on doc updates — keeps the server in sync so snapshots
    // capture recent changes even if the tab is left open for a long time.
    doc.on('update', (_update: Uint8Array, origin: any) => {
      if (!isReady.value) return
      if (origin === 'broadcast') return // other tabs push their own updates
      if (!syncEnabled) return // server sync disabled
      const existing = providers.serverPushTimer
      if (existing) clearTimeout(existing)
      providers.serverPushTimer = setTimeout(() => {
        providers.serverPushTimer = undefined
        pushDocToServer(fullKey, doc, providers.clientId!, syncBase).then(() =>
          createServerSnapshot(fullKey, syncBase),
        )
      }, 30_000) // 30 s debounce — keeps server in sync without hammering it
    })

    // y-indexeddb bug: when fetchUpdates() rejects (e.g. corrupt Y.js CRDT data stored in
    // IndexedDB), the rejection becomes a floating unhandled promise — the library never
    // propagates it to `whenSynced`, so `whenSynced.catch()` is completely useless.
    // The ONLY way to intercept it from outside the library is via window.unhandledrejection.
    //
    // On corruption we query the SERVER for the latest snapshot (which was pushed there on
    // the previous clean load) and let the user choose between restoring that snapshot or
    // starting fresh — no silent data loss.
    const handleSyncError = async (event: PromiseRejectionEvent) => {
      if (isReady.value) return // already synced successfully — not our error
      const msg: string = event.reason?.message ?? String(event.reason ?? '')
      // lib0 (used by y-indexeddb) throws different messages depending on how the
      // binary is malformed. Known variants:
      //   "Unexpected case"        — decoder hit an unexpected switch branch
      //   "Unexpected end of array" — decoder tried to read past end of buffer
      // Both originate from y-indexeddb's fetchUpdates() on corrupt stored data.
      const isYjsCorruption = msg.includes('Unexpected case') || msg.includes('Unexpected end of array')
      if (!isYjsCorruption) return

      event.preventDefault() // suppress "Uncaught (in promise)" in DevTools

      window.removeEventListener('unhandledrejection', handleSyncError)
      providers.idbErrorHandler = undefined

      // Destroy the corrupt IndexedDB provider
      try { await idbProvider.destroy() }
      catch {}
      providers.indexeddb = undefined

      // Await deletion so the fresh provider cannot reopen the corrupt DB before it's gone.
      // indexedDB.deleteDatabase() is event-driven, not Promise-based.
      await new Promise<void>((resolve) => {
        const deleteReq = indexedDB.deleteDatabase(fullKey)
        deleteReq.onsuccess = () => resolve()
        deleteReq.onerror = () => resolve()
        // If another tab has the same DB open, the delete is blocked — give it 1 s.
        deleteReq.onblocked = () => setTimeout(resolve, 1_000)
      })

      console.warn(`[useProtoDoc] Corrupt IndexedDB for "${fullKey}" — querying server for snapshots`)

      // Query the server for the latest available snapshot (only when sync is enabled)
      let latestSnapshotId: string | null = null
      let latestSnapshotAge: number | null = null
      let latestSnapshotLabel: string | null = null

      if (syncEnabled) {
        try {
          const res = await $fetch<{
            success: boolean
            snapshots?: Array<{ id: string, createdAt: string, label: string | null }>
            error?: string
          }>(`${syncBase}/snapshots/${encodeURIComponent(fullKey)}`, {
            query: { limit: 1 },
          })
          if (res.success && res.snapshots?.length) {
            const latest = res.snapshots[0]
            latestSnapshotId = latest.id
            latestSnapshotAge = Date.now() - new Date(latest.createdAt).getTime()
            latestSnapshotLabel = latest.label
          }
        }
        catch {
          // Server unreachable or user not authenticated — no backup available
        }
      }

      // Ask the user what to do
      const { reportCorruption } = useProtoCorruption()
      const action = await reportCorruption({
        fullKey,
        displayName: docKey,
        latestSnapshotId,
        latestSnapshotAge,
        latestSnapshotLabel,
        reason: msg,
      })

      if (action === 'restore' && latestSnapshotId && syncEnabled) {
        // Restore the snapshot on the server (updates yjsDocuments record)
        try {
          await $fetch(`${syncBase}/snapshots/restore`, {
            method: 'POST',
            body: { snapshotId: latestSnapshotId, preferredMethod: 'yjs' },
          })
        }
        catch {
          // Try JSON fallback if Y.js restore fails
          try {
            await $fetch(`${syncBase}/snapshots/restore`, {
              method: 'POST',
              body: { snapshotId: latestSnapshotId, preferredMethod: 'json' },
            })
          }
          catch (e) {
            console.warn('[useProtoDoc] Both restore methods failed:', e)
          }
        }
      }

      // Re-create a fresh local IndexedDB.
      //
      // IMPORTANT: pullFromServer is called AFTER whenSynced (IDB open), not before.
      // y-indexeddb only persists updates that arrive via doc.on('update') while
      // this.db is set. If we called pullFromServer before the IDB was open, the
      // restored updates would be applied to the in-memory doc but never written to
      // IDB — they would be silently lost on the next page load.
      const freshProvider = new IndexeddbPersistence(fullKey, doc)
      providers.indexeddb = freshProvider
      // Mark ready immediately so the UI unblocks; server ops run in the background.
      isReady.value = true

      freshProvider.whenSynced.then(async () => {
        if (action === 'restore' && latestSnapshotId && syncEnabled) {
          // IDB is now open — the provider's doc.on('update') listener is active,
          // so these updates will be captured and persisted to IDB.
          await pullFromServer(fullKey, doc, syncBase)
          // Push the restored state to the server so future snapshots are correct.
          await pushDocToServer(fullKey, doc, providers.clientId!, syncBase)
          await createServerSnapshot(fullKey, syncBase)
        }
        // For 'fresh': do NOT push the in-memory partial state to the server.
        // The server retains its last good snapshot; future user edits will push
        // via the 30 s debounce on doc updates.
      })
    }
    providers.idbErrorHandler = handleSyncError
    window.addEventListener('unhandledrejection', handleSyncError)
  }
  else if (!enableIndexedDB) {
    isReady.value = true
  }

  // ── BroadcastChannel tab sync ──────────────────────────────────────────────
  if (enableBroadcast && !providers.broadcast && import.meta.client) {
    const bc = new BroadcastChannel(fullKey)
    providers.broadcast = bc

    // Apply updates from other tabs — use 'broadcast' origin to avoid re-broadcasting
    bc.onmessage = (event) => {
      if (event.data && event.data.type === 'yjs-update') {
        try {
          Y.applyUpdate(doc, new Uint8Array(event.data.update), 'broadcast')
        }
        catch (err) {
          console.warn(`[useProtoDoc] Failed to apply broadcast update for "${fullKey}":`, err)
        }
      }
    }

    // Broadcast local updates to other tabs (skip updates that came from broadcast)
    doc.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== 'broadcast') {
        try {
          bc.postMessage({ type: 'yjs-update', update: Array.from(update) })
        }
        catch (err) {
          console.warn(`[useProtoDoc] Failed to broadcast update for "${fullKey}":`, err)
        }
      }
    })
  }

  const destroy = () => {
    const count = (refCountCache.get(fullKey) || 1) - 1
    refCountCache.set(fullKey, count)

    if (count <= 0) {
      // Clear debounced server push timer
      if (providers.serverPushTimer) {
        clearTimeout(providers.serverPushTimer)
        providers.serverPushTimer = undefined
      }
      // Clean up unhandledrejection handler to prevent memory leaks
      if (providers.idbErrorHandler && typeof window !== 'undefined') {
        window.removeEventListener('unhandledrejection', providers.idbErrorHandler)
      }
      if (providers.broadcast) {
        providers.broadcast.close()
      }
      if (providers.indexeddb) {
        providers.indexeddb.destroy()
      }
      doc.destroy()
      documentCache.delete(fullKey)
      providerCache.delete(fullKey)
      refCountCache.delete(fullKey)
      isReadyRefCache.delete(fullKey)
    }
  }

  if (!skipAutoCleanup) {
    onUnmounted(() => {
      destroy()
    })
  }

  return { doc, isReady, destroy }
}
