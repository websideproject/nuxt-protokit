<script setup>
defineProps({
  modelValue: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      :value="modelValue"
      type="color"
      class="h-9 w-12 rounded border border-default cursor-pointer"
      @input="emit('update:modelValue', $event.target.value)"
    >
    <UInput
      :model-value="modelValue"
      class="w-full"
      placeholder="#000000"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>
