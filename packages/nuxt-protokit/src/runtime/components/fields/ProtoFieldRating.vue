<script setup lang="ts">
defineProps<{
  modelValue: number
  max?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>

<template>
  <div class="flex gap-1">
    <button
      v-for="star in (max || 5)"
      :key="star"
      type="button"
      class="text-xl transition-colors"
      :class="star <= modelValue ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'"
      @click="emit('update:modelValue', star === modelValue ? 0 : star)"
    >
      <UIcon :name="star <= modelValue ? 'i-lucide-star' : 'i-lucide-star'" class="size-5" />
    </button>
  </div>
</template>
