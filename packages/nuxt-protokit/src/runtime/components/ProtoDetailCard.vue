<script setup lang="ts">
import { computed } from 'vue'
import type { FieldDef } from '../types/schema'
import { applyFormat } from '../utils/formatters'

const props = withDefaults(defineProps<{
  fields: Record<string, FieldDef>
  data: Record<string, any>
  cols?: 1 | 2 | 3
  title?: string
}>(), {
  cols: 2,
})

const gridClass = computed(() => {
  const colMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
  }
  return `grid ${colMap[props.cols] || 'grid-cols-2'} gap-3`
})

function getLabel(key: string, fieldDef: FieldDef): string {
  if (typeof fieldDef.label === 'function') return fieldDef.label(props.data[key])
  return fieldDef.label
}
</script>

<template>
  <UCard>
    <template
      v-if="title"
      #header
    >
      <h3 class="font-semibold">
        {{ title }}
      </h3>
    </template>
    <div :class="gridClass">
      <div
        v-for="(fieldDef, key) in fields"
        :key="key"
        class="space-y-0.5"
      >
        <div class="text-xs text-muted">
          {{ getLabel(key as string, fieldDef) }}
        </div>
        <div class="font-medium text-highlighted">
          {{ applyFormat(data[key as string], (fieldDef as any).format) }}
        </div>
      </div>
    </div>
  </UCard>
</template>
