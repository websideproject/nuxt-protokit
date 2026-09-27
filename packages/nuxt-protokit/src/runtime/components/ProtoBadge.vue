<script setup lang="ts">
defineProps<{
  label: string
  color?: string
  icon?: string
  variant?: 'solid' | 'subtle' | 'outline'
}>()
</script>

<template>
  <UBadge
    :color="(color as any) || 'primary'"
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
