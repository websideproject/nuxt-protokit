<script setup lang="ts">
const props = defineProps<{
  modelValue: number
  placeholder?: string
  min?: number
  max?: number
  step?: number
  leading?: string
  trailing?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>

<template>
  <UInput
    :model-value="modelValue"
    class="w-full"
    type="number"
    :placeholder="placeholder"
    :min="min"
    :max="max"
    :step="step"
    @update:model-value="emit('update:modelValue', Number($event))"
  >
    <template v-if="leading" #leading>
      <span class="text-muted text-sm">{{ leading }}</span>
    </template>
    <template v-if="trailing" #trailing>
      <span class="text-muted text-sm">{{ trailing }}</span>
    </template>
  </UInput>
</template>
