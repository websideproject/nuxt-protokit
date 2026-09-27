<script setup>
import { computed, ref } from 'vue'
const props = defineProps({
  actions: { type: Array, required: true },
  computeContext: { type: Object, required: true },
  collectionArrays: { type: Object, required: true },
  onReset: { type: Function, required: false },
})
const copiedState = ref({})
function isVisible(action) {
  if (!action.showWhen) return true
  return action.showWhen(props.computeContext)
}
async function handleCopyText(action) {
  const text = action.text(props.computeContext, props.collectionArrays)
  try {
    await navigator.clipboard.writeText(text)
    copiedState.value[action.id] = true
    setTimeout(() => {
      copiedState.value[action.id] = false
    }, 2e3)
  }
  catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copiedState.value[action.id] = true
    setTimeout(() => {
      copiedState.value[action.id] = false
    }, 2e3)
  }
}
function handleExportMarkdown(action) {
  const content = action.content(props.computeContext, props.collectionArrays)
  const filename = action.filename || 'export.md'
  try {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  catch {
    navigator.clipboard.writeText(content).catch(() => {
    })
    copiedState.value[action.id] = true
    setTimeout(() => {
      copiedState.value[action.id] = false
    }, 2e3)
  }
}
function handleAction(action) {
  if (action.type === 'copy-text') {
    handleCopyText(action)
  }
  else if (action.type === 'export-markdown') {
    handleExportMarkdown(action)
  }
  else if (action.type === 'reset') {
    props.onReset?.()
  }
}
const visibleActions = computed(() => props.actions.filter(a => isVisible(a)))
</script>

<template>
  <div
    v-if="visibleActions.length > 0"
    class="flex flex-wrap gap-2 pt-2 border-t border-default"
  >
    <UButton
      v-for="action in visibleActions"
      :key="action.id"
      variant="outline"
      size="sm"
      :icon="copiedState[action.id] ? 'i-lucide-check' : action.icon || 'i-lucide-zap'"
      :color="action.type === 'reset' ? 'neutral' : 'primary'"
      @click="handleAction(action)"
    >
      {{ copiedState[action.id] ? "Copied!" : action.label }}
    </UButton>
  </div>
</template>
