<script setup lang="ts">
defineProps<{
  modelValue: number
  min?: number
  max?: number
  step?: number
  rangeLabels?: { min: string; max: string }
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>

<template>
  <div>
    <input
      :value="modelValue"
      type="range"
      class="w-full accent-[var(--ui-primary)]"
      :min="min"
      :max="max"
      :step="step"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    />
    <div v-if="rangeLabels" class="flex justify-between text-xs text-muted mt-0.5">
      <span>{{ rangeLabels.min }}</span>
      <span class="font-medium text-highlighted">{{ modelValue }}</span>
      <span>{{ rangeLabels.max }}</span>
    </div>
  </div>
</template>
