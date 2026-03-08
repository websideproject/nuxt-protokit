import { computed, ref, type Ref, type ComputedRef } from 'vue'
import type * as Y from 'yjs'
import type { PrototypeSchema } from '../types/schema'
import type { EncryptionConfig } from './useProtoDoc'
import type { ComputeContext } from '../types/compute'
import type { CollectionPermissionsResolved, FieldPermissionsResolved } from '../types/permissions'
import { useProtoDoc } from './useProtoDoc'
import { useProtoMap } from './useProtoMap'
import { useProtoList, type UseProtoListReturn } from './useProtoList'
import { useProtoDerived } from './useProtoDerived'
import { useProtoOutputs } from './useProtoOutputs'
import { useProtoPermissions } from './useProtoPermissions'

export interface UsePrototypeReturn {
  state: Record<string, Ref>
  collections: Record<string, UseProtoListReturn<any>>
  derived: ComputedRef<Record<string, any>>
  computeContext: ComputedRef<ComputeContext>
  reset: () => void
  isReady: Ref<boolean>
  doc: Y.Doc
  /**
   * Per-field reactive permission flags for the prototype's top-level fields.
   * Driven by `schema.fields[key].permissions`.
   *
   * ⚠️ Frontend only.
   */
  fieldPermissions: Record<string, FieldPermissionsResolved>
  /**
   * Per-collection reactive CRUD permission flags.
   * Driven by `schema.collections[key].permissions`.
   *
   * ⚠️ Frontend only — also enforce on the server for real security.
   */
  collectionPermissions: Record<string, CollectionPermissionsResolved>
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
    /**
     * Namespace prefix that is prepended to the doc key, creating fully
     * isolated IndexedDB stores and BroadcastChannels per namespace.
     *
     * Compose this from whatever segments your app needs:
     *
     * ```ts
     * // Tenant-shared (all users in the org see the same doc)
     * namespace: tenantId
     *
     * // Private per user within a tenant
     * namespace: `${tenantId}:${userId}`
     *
     * // Private per user, no multi-tenancy
     * namespace: userId
     * ```
     *
     * Resulting key: `<namespace>:<docKey>`
     *
     * When the namespace changes (e.g. user switches tenant), the composable
     * is re-mounted with a different key, so data never bleeds across namespaces.
     */
    namespace?: string
    /**
     * Encrypt all IndexedDB updates with AES-GCM.
     * See `useProtoDoc` for full documentation and security notes.
     *
     * @example
     * usePrototype(schema, { encryption: { password: userPassword } })
     */
    encryption?: EncryptionConfig
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
    const baseKey = options?.docKey ?? schema.key
    const resolvedKey = options?.namespace ? `${options.namespace}:${baseKey}` : baseKey
    const protoDoc = useProtoDoc(resolvedKey, {
      disableSync: options?.disableSync,
      encryption: options?.encryption,
    })
    doc = protoDoc.doc
    isReady = protoDoc.isReady
  }

  // Initialize map state from schema fields
  const { state, reset: resetMap, fieldPermissions } = useProtoMap(doc, schema.key, schema.fields, {
    version: schema.version,
    migrations: schema.migrations,
  })

  // Initialize collections
  const collections: Record<string, UseProtoListReturn<any>> = {}
  const { resolveCollectionPermissions } = useProtoPermissions()
  const collectionPermissions: Record<string, CollectionPermissionsResolved> = {}

  if (schema.collections) {
    for (const [key, collSchema] of Object.entries(schema.collections)) {
      collections[key] = useProtoList(doc, `${schema.key}:${collSchema.key}`, {
        defaults: collSchema.defaults,
        maxItems: collSchema.maxItems,
        version: collSchema.version,
        migrations: collSchema.migrations,
      })
      collectionPermissions[key] = resolveCollectionPermissions(collSchema.permissions, collSchema.key)
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
    fieldPermissions,
    collectionPermissions,
  }
}
