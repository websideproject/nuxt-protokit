<script setup>
defineProps({
  modelValue: { type: Boolean, required: true },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <USwitch
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
