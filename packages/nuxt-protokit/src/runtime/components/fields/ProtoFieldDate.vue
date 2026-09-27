<script setup>
defineProps({
  modelValue: { type: String, required: true },
  placeholder: { type: String, required: false },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <UInput
    :model-value="modelValue"
    class="w-full"
    type="date"
    :placeholder="placeholder"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
