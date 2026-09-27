<script setup lang="ts">
import { computed } from 'vue'
import type { LinkedResponsesFieldDef } from '../../types/schema'

const props = defineProps<{
  fieldDef: LinkedResponsesFieldDef
  modelValue: Array<{ sourceId: string, answer: string }>
  collectionItems?: Record<string, any[]>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Array<{ sourceId: string, answer: string }>]
}>()

const sourceItems = computed(() => {
  return props.collectionItems?.[props.fieldDef.sourceCollection] ?? []
})

// Build a reactive lookup: sourceId → answer
const answersMap = computed(() => {
  const map: Record<string, string> = {}
  for (const r of props.modelValue || []) {
    map[r.sourceId] = r.answer
  }
  return map
})

function getAnswer(sourceId: string): string {
  return answersMap.value[sourceId] ?? ''
}

function setAnswer(sourceId: string, answer: string) {
  const current = [...(props.modelValue || [])]
  const idx = current.findIndex(r => r.sourceId === sourceId)
  if (idx >= 0) {
    current[idx] = { sourceId, answer }
  }
  else {
    current.push({ sourceId, answer })
  }
  emit('update:modelValue', current)
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-if="sourceItems.length === 0"
      class="text-sm text-muted py-4 text-center"
    >
      <UIcon
        :name="'i-lucide-help-circle'"
        class="size-5 mx-auto mb-1 opacity-50"
      />
      <p>No {{ fieldDef.sourceCollection }} found. Add some first.</p>
    </div>
    <div
      v-for="(item, idx) in sourceItems"
      :key="item.id || idx"
      class="space-y-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-muted shrink-0 w-5 text-right">{{ idx + 1 }}.</span>
        <span class="text-sm font-medium text-highlighted flex-1">{{ fieldDef.sourceLabel(item) }}</span>
        <UBadge
          v-if="fieldDef.sourceBadge"
          variant="subtle"
          size="xs"
          class="shrink-0"
        >
          {{ fieldDef.sourceBadge(item) }}
        </UBadge>
      </div>
      <div class="pl-7">
        <UTextarea
          :model-value="getAnswer(item.id || String(idx))"
          :placeholder="fieldDef.answerPlaceholder || 'Record response…'"
          :rows="fieldDef.answerRows || 2"
          class="w-full"
          @update:model-value="setAnswer(item.id || String(idx), $event)"
        />
      </div>
    </div>
  </div>
</template>
