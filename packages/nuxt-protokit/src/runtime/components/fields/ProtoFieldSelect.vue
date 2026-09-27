<script setup>
defineProps({
  modelValue: { type: null, required: true },
  options: { type: Array, required: false },
  placeholder: { type: String, required: false },
  multiple: { type: Boolean, required: false },
})
const emit = defineEmits(['update:modelValue'])
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
