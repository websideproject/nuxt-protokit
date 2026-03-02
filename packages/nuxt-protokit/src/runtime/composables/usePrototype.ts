import { computed, ref, type Ref, type ComputedRef } from 'vue'
import type * as Y from 'yjs'
import type { PrototypeSchema } from '../types/schema'
import type { ComputeContext } from '../types/compute'
import { useProtoDoc } from './useProtoDoc'
import { useProtoMap } from './useProtoMap'
import { useProtoList, type UseProtoListReturn } from './useProtoList'
import { useProtoDerived } from './useProtoDerived'
import { useProtoOutputs } from './useProtoOutputs'

export interface UsePrototypeReturn {
  state: Record<string, Ref>
  collections: Record<string, UseProtoListReturn<any>>
  derived: ComputedRef<Record<string, any>>
  computeContext: ComputedRef<ComputeContext>
  reset: () => void
  isReady: Ref<boolean>
  doc: Y.Doc
}

/**
 * High-level composable: schema → state + derived + collections.
 * Combines useProtoDoc + useProtoMap + useProtoList + useProtoDerived + useProtoOutputs.
 */
export function usePrototype(
  schema: PrototypeSchema,
  options?: {
    docKey?: string
    existingDoc?: Y.Doc
    /**
     * Force this prototype's doc to be local-only, regardless of the global
     * `protokit.serverSync` config. Useful for public demo tools or scratch pads.
     */
    disableSync?: boolean
  },
): UsePrototypeReturn {
  // Get or create document
  let doc: Y.Doc
  let isReady: Ref<boolean>

  if (options?.existingDoc) {
    doc = options.existingDoc
    isReady = ref(true) as Ref<boolean>
  }
  else {
    const protoDoc = useProtoDoc(options?.docKey ?? schema.key, {
      disableSync: options?.disableSync,
    })
    doc = protoDoc.doc
    isReady = protoDoc.isReady
  }

  // Initialize map state from schema fields
  const { state, reset: resetMap } = useProtoMap(doc, schema.key, schema.fields, {
    version: schema.version,
    migrations: schema.migrations,
  })

  // Initialize collections
  const collections: Record<string, UseProtoListReturn<any>> = {}
  if (schema.collections) {
    for (const [key, collSchema] of Object.entries(schema.collections)) {
      collections[key] = useProtoList(doc, `${schema.key}:${collSchema.key}`, {
        defaults: collSchema.defaults,
        maxItems: collSchema.maxItems,
        version: collSchema.version,
        migrations: collSchema.migrations,
      })
    }
  }

  // Compute derived values
  const derived = schema.derived
    ? useProtoDerived(state, schema.derived, { collections })
    : computed(() => ({}))

  // Wire produces/consumes connections
  const { connectionInputs } = useProtoOutputs(doc, schema, derived)

  // Full compute context for display components
  const computeContext = computed<ComputeContext>(() => {
    const fields: Record<string, any> = {}
    for (const [k, v] of Object.entries(state)) {
      fields[k] = v.value
    }

    const collectionArrays: Record<string, any[]> = {}
    for (const [k, v] of Object.entries(collections)) {
      collectionArrays[k] = v.items.value
    }

    return {
      fields,
      derived: derived.value,
      connections: connectionInputs.value,
      collections: collectionArrays,
    }
  })

  const reset = () => {
    resetMap()
    for (const coll of Object.values(collections)) {
      coll.reset()
    }
  }

  return {
    state,
    collections,
    derived,
    computeContext,
    reset,
    isReady,
    doc,
  }
}
