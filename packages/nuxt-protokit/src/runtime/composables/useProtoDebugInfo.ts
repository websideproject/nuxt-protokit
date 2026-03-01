import { computed } from 'vue'
import { documentCache, providerCache, refCountCache, isReadyRefCache } from './useProtoDoc'

export interface ProtoDocDebugEntry {
  /** Full cache key, e.g. "proto:my-idea-abc" */
  fullDocKey: string
  /** User-visible doc key (without "proto:" prefix) */
  docKey: string
  docType: string
  refCount: number
  isReady: boolean
  hasIndexedDB: boolean
  hasBroadcast: boolean
  /** True when server sync is configured for this doc (clientId is set) */
  hasCloud: boolean
}

/**
 * Native debug info composable for protokit documents.
 * Reads directly from the module-level caches in useProtoDoc — no yjs-sync dependency.
 */
export function useProtoDebugInfo() {
  const activeDocs = computed<ProtoDocDebugEntry[]>(() => {
    return [...documentCache.keys()].map((fullKey) => {
      const providers = providerCache.get(fullKey)
      const isReadyRef = isReadyRefCache.get(fullKey)
      const [, ...rest] = fullKey.split(':')
      const docKey = rest.join(':')

      return {
        fullDocKey: fullKey,
        docKey,
        docType: fullKey.startsWith('proto:') ? 'proto' : 'unknown',
        refCount: refCountCache.get(fullKey) ?? 0,
        isReady: isReadyRef?.value ?? false,
        hasIndexedDB: !!providers?.indexeddb,
        hasBroadcast: !!providers?.broadcast,
        hasCloud: !!providers?.clientId,
      }
    })
  })

  const totalDocs = computed(() => documentCache.size)

  function getDocJson(fullKey: string): Record<string, unknown> | null {
    const doc = documentCache.get(fullKey)
    if (!doc) return null
    const result: Record<string, unknown> = {}
    doc.share.forEach((type, key) => {
      try {
        result[key] = type.toJSON()
      }
      catch {
        result[key] = '[error reading]'
      }
    })
    return result
  }

  function refresh() {
    // Computed refs auto-refresh when cache Map references change,
    // but Maps aren't reactive in Vue. Trigger a re-read by forcing a reactive tick.
    // Components can call this to nudge the UI after manual IDB deletion.
    // (No-op: computed values are lazily re-evaluated anyway on next render.)
  }

  return { activeDocs, totalDocs, getDocJson, refresh }
}
