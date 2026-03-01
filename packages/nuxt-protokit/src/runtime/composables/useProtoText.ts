import { ref, watch, type Ref } from 'vue'
import * as Y from 'yjs'

export interface UseProtoTextReturn {
  text: Ref<string>
  ytext: Y.Text
}

/**
 * Bidirectional sync between a Y.Text and a reactive string ref.
 */
export function useProtoText(
  doc: Y.Doc,
  textKey: string,
): UseProtoTextReturn {
  const ytext = doc.getText(textKey)
  const text = ref(ytext.toString())
  let suppressWatch = false

  // Y.Text → ref
  ytext.observe(() => {
    suppressWatch = true
    text.value = ytext.toString()
    queueMicrotask(() => { suppressWatch = false })
  })

  // ref → Y.Text
  watch(text, (newVal) => {
    if (suppressWatch) return
    const current = ytext.toString()
    if (newVal !== current) {
      doc.transact(() => {
        ytext.delete(0, ytext.length)
        ytext.insert(0, newVal)
      })
    }
  })

  return { text, ytext }
}
