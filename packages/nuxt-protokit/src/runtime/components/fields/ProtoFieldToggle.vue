<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <USwitch
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
