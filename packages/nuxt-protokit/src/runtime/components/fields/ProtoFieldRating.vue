<script setup>
defineProps({
  modelValue: { type: Number, required: true },
  max: { type: Number, required: false },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex gap-1">
    <button
      v-for="star in max || 5"
      :key="star"
      type="button"
      class="transition-colors"
      @click="emit('update:modelValue', star === modelValue ? 0 : star)"
    >
      <UIcon
        :name="star <= modelValue ? 'i-lucide-star' : 'i-lucide-star-off'"
        class="size-5 transition-colors"
        :class="star <= modelValue ? 'text-amber-400' : 'text-muted'"
      />
    </button>
  </div>
</template>
