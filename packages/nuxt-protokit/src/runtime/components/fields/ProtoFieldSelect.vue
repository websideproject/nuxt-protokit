<script setup lang="ts">
defineProps<{
  modelValue: any
  options?: Array<string | { label: string, value: any, icon?: string }>
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()
</script>

<template>
  <USelect
    :model-value="modelValue"
    class="w-full"
    :items="options"
    :placeholder="placeholder"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
