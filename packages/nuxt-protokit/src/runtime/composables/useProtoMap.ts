import { ref, watch, onUnmounted, type Ref } from 'vue'
import * as Y from 'yjs'
import type { FieldDef } from '../types/schema'
import { deepClone } from '../utils/deepClone'

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
): UseProtoMapReturn<S> {
  const dataMap = doc.getMap(mapKey)
  const state = {} as Record<keyof S, Ref>
  const suppressSync = new Set<string>()

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
      const isDeep = fieldDef.deep || fieldDef.type === 'tags'
      const yVal = dataMap.get(key)
      // Only update if value actually changed
      if (isDeep) {
        if (JSON.stringify(newVal) !== JSON.stringify(yVal)) {
          dataMap.set(key, deepClone(newVal))
        }
      } else {
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
