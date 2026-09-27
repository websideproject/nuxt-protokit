<script setup>
const props = defineProps({
  modelValue: { type: Number, required: true },
  placeholder: { type: String, required: false },
  min: { type: Number, required: false },
  max: { type: Number, required: false },
  step: { type: Number, required: false },
  leading: { type: String, required: false },
  trailing: { type: String, required: false },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <UInput
    :model-value="modelValue"
    class="w-full"
    type="number"
    :placeholder="placeholder"
    :min="min"
    :max="max"
    :step="step"
    @update:model-value="emit('update:modelValue', Number($event))"
  >
    <template
      v-if="leading"
      #leading
    >
      <span class="text-muted text-sm">{{ leading }}</span>
    </template>
    <template
      v-if="trailing"
      #trailing
    >
      <span class="text-muted text-sm">{{ trailing }}</span>
    </template>
  </UInput>
</template>
