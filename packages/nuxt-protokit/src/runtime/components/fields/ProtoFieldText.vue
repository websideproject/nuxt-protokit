<script setup lang="ts">
defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <UInput
    :model-value="modelValue"
    class="w-full"
    type="text"
    :placeholder="placeholder"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
