import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import type * as Y from 'yjs'
import { deepClone } from '../utils/deepClone'
import { runMigrations } from '../utils/runMigrations'
import type { SchemaMigrations } from '../types/schema'

export interface UseProtoListReturn<T> {
  items: Ref<T[]>
  add: (item: T) => void
  update: (index: number, item: Partial<T>) => void
  remove: (index: number) => void
  move: (from: number, to: number) => void
  reset: () => void
  count: ComputedRef<number>
  dataArray: Y.Array<T>
}

/**
 * Reactive Y.Array with CRUD operations.
 * Keeps a reactive `items` ref in sync with the underlying Y.Array.
 *
 * New fields added to the schema are automatically filled with their defaults
 * on read. For renames or type changes, bump `version` and provide `migrate`.
 */
export function useProtoList<T extends Record<string, any> = Record<string, any>>(
  doc: Y.Doc,
  listKey: string,
  options?: {
    defaults?: T
    maxItems?: number
    /** Current schema version. */
    version?: number
    /** Step functions keyed by target version — applied in order from stored→current. */
    migrations?: SchemaMigrations
    /** Delay migrations until this ref is true (e.g. IndexedDB isReady). */
    waitFor?: Ref<boolean>
  },
): UseProtoListReturn<T> {
  const dataArray = doc.getArray<T>(listKey)

  // Fill defaults for any keys missing from a stored item.
  // This handles the common case of a new field being added to the schema.
  function withDefaults(item: T): T {
    if (!options?.defaults) return deepClone(item)
    return { ...deepClone(options.defaults), ...deepClone(item) }
  }

  // ── Migration ────────────────────────────────────────────────────────────
  // Version is tracked in a small meta Y.Map alongside the list.
  // Migrations must run AFTER the persistence layer has loaded stored data
  // (e.g. IndexedDB), so they are gated on `options.waitFor` when provided.
  if (options?.version !== undefined) {
    const applyMigrations = () => {
      const metaMap = doc.getMap<number>(`${listKey}:__meta__`)
      const storedVersion = metaMap.get('v') ?? 0
      const currentVersion = options.version!

      if (storedVersion < currentVersion && options.migrations) {
        // Step through each version in order and write back in a single transaction.
        const raw = dataArray.toArray()
        const migrated = raw.map(item =>
          runMigrations(item as Record<string, any>, storedVersion, currentVersion, options.migrations!),
        ) as T[]

        doc.transact(() => {
          dataArray.delete(0, dataArray.length)
          dataArray.insert(0, migrated)
          metaMap.set('v', currentVersion)
        })
      }
      else if (storedVersion !== currentVersion) {
        // No migration steps — just stamp the current version.
        metaMap.set('v', currentVersion)
      }
    }

    if (options.waitFor) {
      const stop = watch(options.waitFor, (ready) => {
        if (ready) {
          applyMigrations()
          stop()
        }
      }, { immediate: true })
    }
    else {
      applyMigrations()
    }
  }

  // ── Reactive items ───────────────────────────────────────────────────────
  const items = ref<T[]>(dataArray.toArray().map(withDefaults)) as Ref<T[]>

  // Sync Y.Array → reactive items (defaults filled on every update)
  dataArray.observe(() => {
    items.value = dataArray.toArray().map(withDefaults)
  })

  const add = (item: T) => {
    if (options?.maxItems && dataArray.length >= options.maxItems) return
    dataArray.push([deepClone(item)])
  }

  const update = (index: number, item: Partial<T>) => {
    if (index < 0 || index >= dataArray.length) return
    const existing = dataArray.get(index)
    const merged = { ...deepClone(existing), ...deepClone(item) } as T
    doc.transact(() => {
      dataArray.delete(index, 1)
      dataArray.insert(index, [merged])
    })
  }

  const remove = (index: number) => {
    if (index < 0 || index >= dataArray.length) return
    dataArray.delete(index, 1)
  }

  const move = (from: number, to: number) => {
    if (from === to) return
    if (from < 0 || from >= dataArray.length) return
    if (to < 0 || to >= dataArray.length) return
    const item = deepClone(dataArray.get(from))
    doc.transact(() => {
      dataArray.delete(from, 1)
      dataArray.insert(to, [item])
    })
  }

  const reset = () => {
    doc.transact(() => {
      dataArray.delete(0, dataArray.length)
    })
  }

  const count = computed(() => items.value.length)

  return { items, add, update, remove, move, reset, count, dataArray }
}
