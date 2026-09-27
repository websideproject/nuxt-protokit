import { computed, ref, type Ref, type ComputedRef } from 'vue'
import type * as Y from 'yjs'
import type { CollectionSchema } from '../types/schema'
import type { CollectionPermissionsResolved } from '../types/permissions'
import { useProtoDoc } from './useProtoDoc'
import { useProtoList } from './useProtoList'
import { useProtoPermissions } from './useProtoPermissions'

export interface UseProtoCollectionReturn {
  doc: Y.Doc
  items: Ref<any[]>
  add: (item: any) => void
  update: (index: number, item: any) => void
  remove: (index: number) => void
  move: (from: number, to: number) => void
  count: ComputedRef<number>
  search: Ref<string>
  filtered: ComputedRef<any[]>
  sortKey: Ref<string>
  sortOrder: Ref<'asc' | 'desc'>
  sorted: ComputedRef<any[]>
  reset: () => void
  isReady: Ref<boolean>
  /**
   * Reactive CRUD permission flags derived from `schema.permissions`.
   * All flags are `true` when no permissions are defined on the schema.
   *
   * ⚠️ Frontend guard only — use these to drive UI visibility/disabled
   * states. Enforce collection access on the server for real security.
   */
  permissions: CollectionPermissionsResolved
  destroy: () => void
}

/**
 * High-level CRUD composable from a CollectionSchema.
 * Provides search, sort, and all CRUD operations.
 */
export function useProtoCollection(
  schema: CollectionSchema,
  options?: {
    docKey?: string
    existingDoc?: Y.Doc
    disableSync?: boolean
  },
): UseProtoCollectionReturn {
  let doc: Y.Doc
  let isReady: Ref<boolean>
  let destroy: () => void = () => {}

  if (options?.existingDoc) {
    doc = options.existingDoc
    isReady = ref(true) as Ref<boolean>
  }
  else {
    const protoDoc = useProtoDoc(options?.docKey ?? `collection-${schema.key}`, {
      disableSync: options?.disableSync,
    })
    doc = protoDoc.doc
    isReady = protoDoc.isReady
    destroy = protoDoc.destroy
  }

  const list = useProtoList(doc, schema.key, {
    defaults: schema.defaults as any,
    maxItems: schema.maxItems,
    version: schema.version,
    migrations: schema.migrations,
    waitFor: isReady,
  })

  const { resolveCollectionPermissions } = useProtoPermissions()
  const permissions = resolveCollectionPermissions(schema.permissions, schema.key)

  // Search
  const search = ref('')
  const filtered = computed(() => {
    if (!search.value || !schema.searchable) return list.items.value
    const q = search.value.toLowerCase()
    const searchFields = schema.searchFields || Object.keys(schema.fields)
    return list.items.value.filter((item) => {
      return searchFields.some((field) => {
        const val = item[field]
        return val != null && String(val).toLowerCase().includes(q)
      })
    })
  })

  // Sort
  const sortKey = ref(schema.sortBy || '')
  const sortOrder = ref<'asc' | 'desc'>(schema.sortOrder || 'asc')
  const sorted = computed(() => {
    const source = filtered.value
    if (!sortKey.value) return source
    return [...source].sort((a, b) => {
      const aVal = a[sortKey.value]
      const bVal = b[sortKey.value]
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortOrder.value === 'asc' ? cmp : -cmp
    })
  })

  return {
    doc,
    items: list.items,
    add: list.add,
    update: list.update,
    remove: list.remove,
    move: list.move,
    count: list.count,
    search,
    filtered,
    sortKey,
    sortOrder,
    sorted,
    reset: list.reset,
    isReady,
    permissions,
    destroy,
  }
}
