import { ref, watch, onUnmounted, type ComputedRef, type Ref } from 'vue'
import type * as Y from 'yjs'
import type { PrototypeSchema } from '../types/schema'

/**
 * Handles schema-level produces/consumes connections.
 *
 * - Watches derived values → writes produces fields to doc.getMap('outputs:{schema.key}')
 * - Reads all consumes sources from output maps → returns reactive connectionInputs
 *
 * In paid mode (shared Y.Doc), data flows automatically — all tools share one doc.
 * In free mode (standalone Y.Doc), connections return defaults (no cross-tool data).
 */
export function useProtoOutputs(
  doc: Y.Doc,
  schema: PrototypeSchema,
  derived: ComputedRef<Record<string, any>>,
): { connectionInputs: Ref<Record<string, any>> } {
  const outputsMap = doc.getMap<any>(`outputs:${schema.key}`)
  const connectionInputs = ref<Record<string, any>>({})

  // Write produces fields to outputs map whenever derived changes
  if (schema.produces) {
    const producesKeys = Object.keys(schema.produces)
    watch(
      derived,
      (d) => {
        doc.transact(() => {
          for (const key of producesKeys) {
            const val = d[key]
            if (val !== undefined) {
              outputsMap.set(key, val)
            }
          }
        })
      },
      { immediate: true, deep: true },
    )
  }

  // Read consumes sources from output maps
  if (schema.consumes) {
    const cleanups: Array<() => void> = []

    const readAll = () => {
      const result: Record<string, any> = {}
      for (const [localKey, sourcePath] of Object.entries(schema.consumes!)) {
        const [sourceToolKey, sourceField] = sourcePath.split('.')
        if (!sourceToolKey || !sourceField) continue
        const sourceMap = doc.getMap<any>(`outputs:${sourceToolKey}`)
        result[localKey] = sourceMap.get(sourceField) ?? undefined
      }
      connectionInputs.value = result
    }

    // Initial read
    readAll()

    // Observe all source maps
    for (const sourcePath of Object.values(schema.consumes)) {
      const [sourceToolKey] = sourcePath.split('.')
      if (!sourceToolKey) continue
      const sourceMap = doc.getMap<any>(`outputs:${sourceToolKey}`)
      const observer = () => readAll()
      sourceMap.observe(observer)
      cleanups.push(() => sourceMap.unobserve(observer))
    }

    onUnmounted(() => {
      for (const cleanup of cleanups) cleanup()
    })
  }

  return { connectionInputs }
}
