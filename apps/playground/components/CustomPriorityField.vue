<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  options?: string[]
}>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const levels = computed(() => props.options ?? ['low', 'medium', 'high', 'critical'])

const styleMap: Record<string, { idle: string, active: string }> = {
  low: {
    idle: 'bg-muted/60 text-muted hover:bg-muted',
    active: 'bg-muted text-highlighted ring-2 ring-muted-foreground/40',
  },
  medium: {
    idle: 'bg-amber-100/60 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400',
    active: 'bg-amber-100 text-amber-700 ring-2 ring-amber-400 dark:bg-amber-900/40 dark:text-amber-300',
  },
  high: {
    idle: 'bg-orange-100/60 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400',
    active: 'bg-orange-100 text-orange-700 ring-2 ring-orange-400 dark:bg-orange-900/40 dark:text-orange-300',
  },
  critical: {
    idle: 'bg-red-100/60 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400',
    active: 'bg-red-100 text-red-700 ring-2 ring-red-400 dark:bg-red-900/40 dark:text-red-300',
  },
}

function getClass(level: string) {
  const s = styleMap[level] ?? { idle: 'bg-muted text-muted hover:bg-muted/80', active: 'bg-muted ring-2' }
  return props.modelValue === level ? s.active : s.idle
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="level in levels"
      :key="level"
      type="button"
      class="px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer"
      :class="getClass(level)"
      @click="emit('update:modelValue', level)"
    >
      {{ level }}
    </button>
  </div>
</template>
