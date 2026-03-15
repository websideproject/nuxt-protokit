<script setup lang="ts">
defineProps<{
  modelValue: any
  options?: Array<string | { label: string, value: any, icon?: string }>
  placeholder?: string
  multiple?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()
</script>

<template>
  <USelectMenu
    :model-value="modelValue"
    class="w-full"
    :items="options"
    :placeholder="placeholder"
    :multiple="multiple"
    value-key="value"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
