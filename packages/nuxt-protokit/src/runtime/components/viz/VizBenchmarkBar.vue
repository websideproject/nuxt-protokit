<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: number
  median: number
  min?: number
  max?: number
  label?: string
  unit?: string
}>(), {
  min: 0,
  max: 100,
})

const range = computed(() => props.max - props.min)
const valuePos = computed(() => Math.min(100, Math.max(0, ((props.value - props.min) / range.value) * 100)))
const medianPos = computed(() => Math.min(100, Math.max(0, ((props.median - props.min) / range.value) * 100)))

const valueColor = computed(() => {
  if (props.value >= props.median) return 'bg-emerald-500'
  return 'bg-amber-500'
})
</script>

<template>
  <div class="space-y-2">
    <div
      v-if="label"
      class="flex justify-between text-sm"
    >
      <span class="text-muted">{{ label }}</span>
      <span class="font-medium text-highlighted">{{ value }}{{ unit || '' }}</span>
    </div>
    <div class="relative h-4 bg-muted rounded-full overflow-hidden">
      <!-- Value bar -->
      <div
        class="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
        :class="valueColor"
        :style="{ width: `${valuePos}%` }"
      />
      <!-- Median marker -->
      <div
        class="absolute top-0 h-full w-0.5 bg-highlighted"
        :style="{ left: `${medianPos}%` }"
      />
    </div>
    <div class="flex justify-between text-xs text-muted">
      <span>{{ min }}{{ unit || '' }}</span>
      <span>Median: {{ median }}{{ unit || '' }}</span>
      <span>{{ max }}{{ unit || '' }}</span>
    </div>
  </div>
</template>
