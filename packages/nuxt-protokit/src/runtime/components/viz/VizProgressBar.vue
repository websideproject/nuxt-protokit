<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  max?: number
  label?: string
  thresholds?: Array<{ value: number, color: string, label?: string }>
}>(), {
  max: 100,
})

const percentage = computed(() => Math.min(100, Math.max(0, (props.value / props.max) * 100)))

const barColor = computed(() => {
  if (!props.thresholds || props.thresholds.length === 0) return 'bg-primary'
  // Find the matching threshold (last one where value >= threshold value)
  const sorted = [...props.thresholds].sort((a, b) => a.value - b.value)
  let color = sorted[0]?.color || 'bg-primary'
  for (const t of sorted) {
    if (props.value >= t.value) color = t.color
  }
  return color
})

const thresholdLabel = computed(() => {
  if (!props.thresholds) return null
  // The same threshold as the colour: the last one the value has reached
  const sorted = [...props.thresholds].sort((a, b) => a.value - b.value)
  let label: string | null = null
  for (const t of sorted) {
    if (props.value >= t.value && t.label) label = t.label
  }
  return label
})
</script>

<template>
  <div class="space-y-1">
    <div
      v-if="label || thresholdLabel"
      class="flex justify-between text-sm"
    >
      <span class="text-muted">{{ label }}</span>
      <span class="font-medium text-highlighted">{{ thresholdLabel || `${Math.round(percentage)}%` }}</span>
    </div>
    <div class="h-3 bg-muted rounded-full overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-300"
        :class="barColor"
        :style="{ width: `${percentage}%` }"
      />
    </div>
  </div>
</template>
