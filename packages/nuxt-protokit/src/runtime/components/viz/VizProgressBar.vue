<script setup>
import { computed } from 'vue'
const props = defineProps({
  value: { type: Number, required: true },
  max: { type: Number, required: false, default: 100 },
  label: { type: String, required: false },
  thresholds: { type: Array, required: false },
})
const percentage = computed(() => Math.min(100, Math.max(0, props.value / props.max * 100)))
const barColor = computed(() => {
  if (!props.thresholds || props.thresholds.length === 0) return 'bg-primary'
  const sorted = [...props.thresholds].sort((a, b) => a.value - b.value)
  let color = sorted[0]?.color || 'bg-primary'
  for (const t of sorted) {
    if (props.value >= t.value) color = t.color
  }
  return color
})
const thresholdLabel = computed(() => {
  if (!props.thresholds) return null
  const sorted = [...props.thresholds].sort((a, b) => a.value - b.value)
  for (const t of sorted) {
    if (props.value >= t.value && t.label) return t.label
  }
  return null
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
