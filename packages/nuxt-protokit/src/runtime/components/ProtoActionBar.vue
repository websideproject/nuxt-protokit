<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ProtoAction } from '../types/schema'
import type { ComputeContext } from '../types/compute'

const props = defineProps<{
  actions: ProtoAction[]
  computeContext: ComputeContext
  collectionArrays: Record<string, any[]>
  onReset?: () => void
}>()

// Track per-button "Copied!" state
const copiedState = ref<Record<string, boolean>>({})

function isVisible(action: ProtoAction): boolean {
  if (!action.showWhen) return true
  return action.showWhen(props.computeContext)
}

async function handleCopyText(action: Extract<ProtoAction, { type: 'copy-text' }>) {
  const text = action.text(props.computeContext, props.collectionArrays)
  try {
    await navigator.clipboard.writeText(text)
    copiedState.value[action.id] = true
    setTimeout(() => {
      copiedState.value[action.id] = false
    }, 2000)
  }
  catch {
    // Fallback: create temp textarea
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
    }, 2000)
  }
}

function handleExportMarkdown(action: Extract<ProtoAction, { type: 'export-markdown' }>) {
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
    // Fallback: clipboard
    navigator.clipboard.writeText(content).catch(() => {})
    copiedState.value[action.id] = true
    setTimeout(() => {
      copiedState.value[action.id] = false
    }, 2000)
  }
}

function handleAction(action: ProtoAction) {
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
      :icon="copiedState[action.id] ? 'i-lucide-check' : (action.icon || 'i-lucide-zap')"
      :color="action.type === 'reset' ? 'neutral' : 'primary'"
      @click="handleAction(action)"
    >
      {{ copiedState[action.id] ? 'Copied!' : action.label }}
    </UButton>
  </div>
</template>
