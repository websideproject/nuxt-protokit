<script setup lang="ts">
import { computed } from 'vue'

interface StatItem {
  label: string
  value: string | number
  subLabel?: string
  valueClass?: string
  bgClass?: string
}

const props = withDefaults(defineProps<{
  stats: StatItem[]
  cols?: 2 | 3 | 4
  size?: 'sm' | 'md'
}>(), {
  cols: 4,
  size: 'md',
})

const gridClass = computed(() => {
  const base = props.cols === 2
    ? 'grid-cols-2'
    : props.cols === 3
      ? 'grid-cols-3'
      : 'grid-cols-2 md:grid-cols-4'
  return `grid ${base} gap-4`
})
</script>

<template>
  <div :class="gridClass">
    <div
      v-for="(stat, i) in stats"
      :key="i"
      class="text-center rounded-lg"
      :class="[stat.bgClass || 'bg-muted', size === 'sm' ? 'p-2' : 'p-3']"
    >
      <div
        class="font-bold"
        :class="[
          stat.valueClass || 'text-highlighted',
          size === 'sm' ? 'text-lg' : 'text-xl',
        ]"
      >
        {{ stat.value }}
      </div>
      <div class="text-xs text-muted">
        {{ stat.label }}
      </div>
      <div
        v-if="stat.subLabel"
        class="text-xs text-muted mt-0.5"
      >
        {{ stat.subLabel }}
      </div>
    </div>
  </div>
</template>
