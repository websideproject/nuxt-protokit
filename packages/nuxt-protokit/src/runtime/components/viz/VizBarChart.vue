<script setup lang="ts">
const props = withDefaults(defineProps<{
  data: Array<{ label: string; value: number; color?: string }>
  maxValue?: number
  unit?: string
}>(), {
  unit: '',
})

const max = computed(() => {
  if (props.maxValue) return props.maxValue
  return Math.max(...props.data.map(d => d.value), 1)
})
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(item, i) in data"
      :key="i"
      class="space-y-1"
    >
      <div class="flex justify-between text-sm">
        <span class="text-muted truncate mr-2">{{ item.label }}</span>
        <span class="font-medium text-highlighted shrink-0">{{ item.value }}{{ unit }}</span>
      </div>
      <div class="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="item.color || 'bg-[var(--ui-primary)]'"
          :style="{ width: `${Math.min(100, (item.value / max) * 100)}%` }"
        />
      </div>
    </div>
  </div>
</template>
