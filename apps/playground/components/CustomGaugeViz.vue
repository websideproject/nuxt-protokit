<script setup lang="ts">
import type { ComputeContext } from '#protokit/types'

const props = defineProps<{
  config: Record<string, any>
  context: ComputeContext
}>()

const value = computed(() => {
  const raw = typeof props.config.value === 'function'
    ? props.config.value(props.context)
    : (props.config.value ?? 0)
  return Math.max(0, Math.min(props.config.max ?? 100, raw))
})

const pct = computed(() => value.value / (props.config.max ?? 100))

// SVG half-circle gauge
const radius = 56
const cx = 80
const cy = 80
const sw = 12
const arcLength = Math.PI * radius

const dashOffset = computed(() => arcLength * (1 - pct.value))

const strokeColor = computed(() => {
  if (pct.value < 0.34) return '#ef4444'
  if (pct.value < 0.67) return '#f59e0b'
  return '#10b981'
})
</script>

<template>
  <div class="flex flex-col items-center gap-1 py-2">
    <svg width="160" height="88" viewBox="0 0 160 88" overflow="visible">
      <!-- Track -->
      <path
        :d="`M ${cx - radius},${cy} A ${radius},${radius} 0 0 1 ${cx + radius},${cy}`"
        fill="none"
        stroke="currentColor"
        class="text-muted/25"
        :stroke-width="sw"
        stroke-linecap="round"
      />
      <!-- Fill -->
      <path
        :d="`M ${cx - radius},${cy} A ${radius},${radius} 0 0 1 ${cx + radius},${cy}`"
        fill="none"
        :stroke="strokeColor"
        :stroke-width="sw"
        stroke-linecap="round"
        :stroke-dasharray="arcLength"
        :stroke-dashoffset="dashOffset"
        style="transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease"
      />
      <!-- Value label -->
      <text
        :x="cx"
        y="68"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="currentColor"
        class="text-highlighted"
        style="font-size: 22px; font-weight: 700"
      >
        {{ value }}
      </text>
    </svg>
    <p v-if="config.label" class="text-xs text-muted">{{ config.label }}</p>
  </div>
</template>
