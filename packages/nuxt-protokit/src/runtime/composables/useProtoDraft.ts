import { ref, onUnmounted, type Ref } from 'vue'
import type * as Y from 'yjs'

/**
 * Draft persistence via Y.js.
 * Stores draft data in doc.getMap('draft:' + draftKey).
 * The '_has' key flags whether an active draft exists.
 */
export function useProtoDraft(doc: Y.Doc, draftKey: string, defaults: Record<string, any>) {
  const draftMap = doc.getMap<any>(`draft:${draftKey}`)

  const hasDraft = ref<boolean>(draftMap.get('_has') === true)

  // Keep hasDraft reactive via Y.Map observer
  const observer = () => {
    hasDraft.value = draftMap.get('_has') === true
  }
  draftMap.observe(observer)
  onUnmounted(() => draftMap.unobserve(observer))

  function saveDraft(data: Record<string, any>) {
    doc.transact(() => {
      draftMap.set('_has', true)
      for (const [k, v] of Object.entries(data)) {
        draftMap.set(k, v)
      }
    })
  }

  function loadDraft(): Record<string, any> {
    if (!draftMap.get('_has')) return { ...defaults }
    const result: Record<string, any> = { ...defaults }
    for (const key of draftMap.keys()) {
      if (key !== '_has') {
        result[key] = draftMap.get(key)
      }
    }
    return result
  }

  function clearDraft() {
    doc.transact(() => {
      draftMap.clear()
    })
  }

  return { hasDraft: hasDraft as Ref<boolean>, saveDraft, loadDraft, clearDraft }
}
