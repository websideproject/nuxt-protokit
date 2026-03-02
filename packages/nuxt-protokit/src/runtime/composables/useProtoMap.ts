import { ref, watch, onUnmounted, type Ref } from 'vue'
import type * as Y from 'yjs'
import type { FieldDef, SchemaMigrations } from '../types/schema'
import { deepClone } from '../utils/deepClone'
import { runMigrations } from '../utils/runMigrations'

export interface UseProtoMapReturn<S extends Record<string, FieldDef>> {
  state: Record<keyof S, Ref>
  reset: () => void
  dataMap: Y.Map<any>
  set: (key: string, value: any) => void
}

/**
 * Bidirectional sync between a Y.Map and reactive Refs.
 * Schema defines the fields, their defaults, and types.
 */
export function useProtoMap<S extends Record<string, FieldDef>>(
  doc: Y.Doc,
  mapKey: string,
  schema: S,
  options?: {
    version?: number
    migrations?: SchemaMigrations
  },
): UseProtoMapReturn<S> {
  const dataMap = doc.getMap(mapKey)
  const state = {} as Record<keyof S, Ref>
  const suppressSync = new Set<string>()

  // ── Migration ────────────────────────────────────────────────────────────
  // Version is tracked as a special key inside the same Y.Map.
  if (options?.version !== undefined) {
    const storedVersion = (dataMap.get('__proto_version__') as number) ?? 0
    const currentVersion = options.version

    if (storedVersion < currentVersion && options.migrations) {
      // Snapshot current values for all schema keys
      const snapshot: Record<string, any> = {}
      for (const key of Object.keys(schema)) {
        const val = dataMap.get(key)
        if (val !== undefined) snapshot[key] = val
      }

      const migrated = runMigrations(snapshot, storedVersion, currentVersion, options.migrations)

      doc.transact(() => {
        for (const [key, value] of Object.entries(migrated)) {
          if (key in schema) dataMap.set(key, deepClone(value))
        }
        dataMap.set('__proto_version__', currentVersion)
      })
    }
    else if (storedVersion !== currentVersion) {
      dataMap.set('__proto_version__', currentVersion)
    }
  }

  // Initialize refs from schema defaults, then override with Y.Map values
  for (const [key, fieldDef] of Object.entries(schema)) {
    const existing = dataMap.get(key)
    const initial = existing !== undefined ? existing : deepClone(fieldDef.default)

    // Set default into Y.Map if not present
    if (existing === undefined) {
      dataMap.set(key, deepClone(fieldDef.default))
    }

    const fieldRef = ref(initial)
    ;(state as any)[key] = fieldRef

    // Watch ref → sync to Y.Map
    watch(fieldRef, (newVal) => {
      if (suppressSync.has(key)) return
      const isDeep = (fieldDef as any).deep || fieldDef.type === 'tags'
      const yVal = dataMap.get(key)
      // Only update if value actually changed
      if (isDeep) {
        if (JSON.stringify(newVal) !== JSON.stringify(yVal)) {
          dataMap.set(key, deepClone(newVal))
        }
      }
      else {
        if (newVal !== yVal) {
          dataMap.set(key, newVal)
        }
      }
    }, { deep: true })
  }

  // Y.Map → sync to refs
  dataMap.observe((event) => {
    event.changes.keys.forEach((change, key) => {
      if (key in state) {
        const newVal = dataMap.get(key)
        const fieldRef = (state as any)[key] as Ref
        suppressSync.add(key)
        fieldRef.value = newVal
        // Allow sync again on next tick
        queueMicrotask(() => suppressSync.delete(key))
      }
    })
  })

  const reset = () => {
    doc.transact(() => {
      for (const [key, fieldDef] of Object.entries(schema)) {
        const defaultVal = deepClone(fieldDef.default)
        dataMap.set(key, defaultVal)
        ;((state as any)[key] as Ref).value = defaultVal
      }
    })
  }

  const set = (key: string, value: any) => {
    dataMap.set(key, value)
  }

  return { state, reset, dataMap, set }
}
