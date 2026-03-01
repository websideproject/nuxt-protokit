import { ref, computed, type Ref, type ComputedRef } from 'vue'
import * as Y from 'yjs'
import { deepClone } from '../utils/deepClone'

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
 */
export function useProtoList<T extends Record<string, any> = Record<string, any>>(
  doc: Y.Doc,
  listKey: string,
  options?: { defaults?: T; maxItems?: number },
): UseProtoListReturn<T> {
  const dataArray = doc.getArray<T>(listKey)
  const items = ref<T[]>(dataArray.toArray().map(i => deepClone(i))) as Ref<T[]>

  // Sync Y.Array → reactive items
  dataArray.observe(() => {
    items.value = dataArray.toArray().map(i => deepClone(i))
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
