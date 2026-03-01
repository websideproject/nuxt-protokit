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
  <UTextarea
    :model-value="modelValue"
    class="w-full"
    :placeholder="placeholder"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
