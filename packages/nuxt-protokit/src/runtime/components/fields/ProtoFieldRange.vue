<script setup>
defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, required: false },
  max: { type: Number, required: false },
  step: { type: Number, required: false },
  rangeLabels: { type: Object, required: false },
})
const emit = defineEmits(['update:modelValue'])
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
      @input="emit('update:modelValue', Number($event.target.value))"
    >
    <div
      v-if="rangeLabels"
      class="flex justify-between text-xs text-muted mt-0.5"
    >
      <span>{{ rangeLabels.min }}</span>
      <span class="font-medium text-highlighted">{{ modelValue }}</span>
      <span>{{ rangeLabels.max }}</span>
    </div>
  </div>
</template>
