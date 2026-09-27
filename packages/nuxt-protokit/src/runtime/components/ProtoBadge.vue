<script setup>
defineProps({
  label: { type: String, required: true },
  color: { type: String, required: false },
  icon: { type: String, required: false },
  variant: { type: String, required: false },
})
</script>

<template>
  <UBadge
    :color="color || 'primary'"
    :variant="variant || 'subtle'"
  >
    <UIcon
      v-if="icon"
      :name="icon"
      class="size-3 mr-1"
    />
    {{ label }}
  </UBadge>
</template>
