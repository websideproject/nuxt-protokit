<script setup>
defineProps({
  modelValue: { type: String, required: true },
  placeholder: { type: String, required: false },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <UTextarea
    :model-value="modelValue"
    class="w-full"
    :placeholder="placeholder"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
