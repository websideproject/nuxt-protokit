import { ref, onUnmounted, type Ref } from 'vue'
import type * as Y from 'yjs'
import type { ConnectionsDef } from '../types/compute'

/**
 * Observe data from other Y.js documents/maps.
 * Returns reactive refs that update when the source data changes.
 */
export function useProtoConnections(
  connectionsDef: ConnectionsDef,
  getDoc: (docKey: string) => Y.Doc | null,
): Record<string, Ref<Record<string, any>>> {
  const result: Record<string, Ref<Record<string, any>>> = {}
  const cleanups: Array<() => void> = []

  for (const [connName, connDef] of Object.entries(connectionsDef)) {
    const data = ref<Record<string, any>>({})
    result[connName] = data

    const sourceDoc = getDoc(connDef.sourceDocKey)
    if (!sourceDoc) continue

    const sourceMap = sourceDoc.getMap(connDef.sourceMapKey)

    // Initial read
    const readFields = () => {
      const snapshot: Record<string, any> = {}
      for (const field of connDef.fields) {
        snapshot[field] = sourceMap.get(field)
      }
      data.value = snapshot
    }

    readFields()

    // Observe changes
    const observer = () => readFields()
    sourceMap.observe(observer)
    cleanups.push(() => sourceMap.unobserve(observer))
  }

  onUnmounted(() => {
    for (const cleanup of cleanups) cleanup()
  })

  return result
}
