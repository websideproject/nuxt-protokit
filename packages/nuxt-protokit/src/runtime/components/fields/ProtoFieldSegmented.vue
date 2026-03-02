<script setup lang="ts">
defineProps<{
  modelValue: any
  options?: Array<string | { label: string, value: any, icon?: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

function getItems(options: Array<string | { label: string, value: any, icon?: string }> | undefined) {
  if (!options) return []
  return options.map(o => typeof o === 'string' ? { label: o, value: o } : o)
}
</script>

<template>
  <div class="flex flex-wrap gap-1">
    <UButton
      v-for="item in getItems(options)"
      :key="item.value"
      size="sm"
      :variant="modelValue === item.value ? 'solid' : 'outline'"
      :icon="item.icon"
      @click="emit('update:modelValue', item.value)"
    >
      {{ item.label }}
    </UButton>
  </div>
</template>
