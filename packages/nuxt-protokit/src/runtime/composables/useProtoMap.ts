import { ref, watch, onUnmounted, type Ref } from 'vue'
import type * as Y from 'yjs'
import type { FieldDef, SchemaMigrations } from '../types/schema'
import type { FieldPermissionsResolved } from '../types/permissions'
import { deepClone } from '../utils/deepClone'
import { runMigrations } from '../utils/runMigrations'
import { useProtoPermissions } from './useProtoPermissions'

export interface UseProtoMapReturn<S extends Record<string, FieldDef>> {
  state: Record<keyof S, Ref>
  reset: () => void
  dataMap: Y.Map<any>
  set: (key: string, value: any) => void
  /**
   * Per-field reactive permission flags derived from each field's
   * `permissions` definition in the schema.
   *
   * Use `fieldPermissions.myField.canRead` to conditionally render a field
   * and `fieldPermissions.myField.canWrite` to disable its input.
   *
   * ⚠️ Frontend only — the Y.js map value is always accessible.
   */
  fieldPermissions: Record<keyof S, FieldPermissionsResolved>
}

/**
 * Bidirectional sync between a Y.Map and reactive Refs.
 * Schema defines the fields, their defaults, and types.
 *
 * Defaults are never written into the Y.Map: a field that was never set reads as its default. Writing them would
 * race the stored data — a default set before IndexedDB (or another peer) delivers the saved value is a concurrent
 * edit, and Y.js resolves concurrent map writes by client ID, so the default won about half of the time.
 */
export function useProtoMap<S extends Record<string, FieldDef>>(
  doc: Y.Doc,
  mapKey: string,
  schema: S,
  options?: {
    version?: number
    migrations?: SchemaMigrations
    /**
     * Pass the doc's `isReady` (from `useProtoDoc`) so migrations run on the stored data once it has loaded.
     * Without it, migrations run immediately — correct only for a doc that is already loaded.
     */
    isReady?: Ref<boolean>
  },
): UseProtoMapReturn<S> {
  const dataMap = doc.getMap(mapKey)
  const state = {} as Record<keyof S, Ref>
  const suppressSync = new Set<string>()
  const { resolveFieldPermissions } = useProtoPermissions()
  const fieldPermissions = {} as Record<keyof S, FieldPermissionsResolved>

  // ── Migration ────────────────────────────────────────────────────────────
  // Version is tracked as a special key inside the same Y.Map.
  const migrate = () => {
    if (options?.version === undefined) return
    const storedVersion = (dataMap.get('__proto_version__') as number) ?? 0
    const currentVersion = options.version

    if (storedVersion < currentVersion && options.migrations) {
      // Snapshot every stored value, including fields the current schema no longer has, so a migration can
      // read the old field it replaces
      const snapshot: Record<string, any> = {}
      dataMap.forEach((val, key) => {
        if (key !== '__proto_version__' && val !== undefined) snapshot[key] = val
      })

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

  if (!options?.isReady || options.isReady.value) {
    migrate()
  }
  else {
    const stop = watch(options.isReady, (ready) => {
      if (!ready) return
      stop()
      migrate()
    })
  }

  // Initialize refs from Y.Map values, falling back to the schema defaults
  for (const [key, fieldDef] of Object.entries(schema)) {
    const existing = dataMap.get(key)
    const initial = existing !== undefined ? existing : deepClone(fieldDef.default)

    const fieldRef = ref(initial)
    ;(state as any)[key] = fieldRef
    ;(fieldPermissions as any)[key] = resolveFieldPermissions(
      (fieldDef as any).permissions,
      { field: key },
    )

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

  return { state, reset, dataMap, set, fieldPermissions }
}
