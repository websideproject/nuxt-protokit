import { computed, type Ref, type ComputedRef } from 'vue'
import type { ComputeContext, DerivedDef } from '../types/compute'

/**
 * Compute derived values from reactive fields and other derived values.
 * Resolves in definition order — later derived values can reference earlier ones.
 *
 * @param state - Reactive state refs (from useProtoMap)
 * @param derivedDefs - Map of derived value definitions
 * @param extras - Optional extra context (connections, collections)
 */
export function useProtoDerived(
  state: Record<string, Ref>,
  derivedDefs: Record<string, DerivedDef>,
  extras?: {
    connections?: Record<string, any>
    collections?: Record<string, { items: Ref<any[]> }>
  },
): ComputedRef<Record<string, any>> {
  return computed(() => {
    // Unwrap all field refs
    const fields: Record<string, any> = {}
    for (const [k, v] of Object.entries(state)) {
      fields[k] = v.value
    }

    // Unwrap connections
    const connections: Record<string, any> = {}
    if (extras?.connections) {
      for (const [k, v] of Object.entries(extras.connections)) {
        connections[k] = v
      }
    }

    // Unwrap collections
    const collectionArrays: Record<string, any[]> = {}
    if (extras?.collections) {
      for (const [k, v] of Object.entries(extras.collections)) {
        collectionArrays[k] = v.items.value
      }
    }

    // Compute derived values in definition order
    const derived: Record<string, any> = {}
    const ctx: ComputeContext = { fields, derived, connections, collections: collectionArrays }

    for (const [key, def] of Object.entries(derivedDefs)) {
      derived[key] = def.compute(ctx)
    }

    return derived
  })
}
