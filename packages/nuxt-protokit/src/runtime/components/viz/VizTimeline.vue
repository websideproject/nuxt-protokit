<script setup lang="ts">
defineProps<{
  items: Array<{
    title: string
    description?: string
    date?: string
    status?: 'done' | 'current' | 'upcoming'
    icon?: string
  }>
}>()

function statusColor(status?: string) {
  switch (status) {
    case 'done': return 'bg-emerald-500'
    case 'current': return 'bg-[var(--ui-primary)]'
    case 'upcoming': return 'bg-muted'
    default: return 'bg-muted'
  }
}

function statusRing(status?: string) {
  return status === 'current' ? 'ring-2 ring-[var(--ui-primary)] ring-offset-2 ring-offset-[var(--ui-bg)]' : ''
}
</script>

<template>
  <div class="relative space-y-0">
    <div
      v-for="(item, i) in items"
      :key="i"
      class="flex gap-3 pb-6 last:pb-0"
    >
      <!-- Timeline line + dot -->
      <div class="flex flex-col items-center">
        <div
          class="size-3 rounded-full shrink-0"
          :class="[statusColor(item.status), statusRing(item.status)]"
        />
        <div
          v-if="i < items.length - 1"
          class="w-0.5 flex-1 bg-muted mt-1"
        />
      </div>
      <!-- Content -->
      <div class="min-w-0 pt-0">
        <div class="flex items-center gap-2">
          <UIcon v-if="item.icon" :name="item.icon" class="size-4 text-muted shrink-0" />
          <span class="font-medium text-highlighted text-sm">{{ item.title }}</span>
          <span v-if="item.date" class="text-xs text-muted">{{ item.date }}</span>
        </div>
        <p v-if="item.description" class="text-sm text-muted mt-0.5">{{ item.description }}</p>
      </div>
    </div>
  </div>
</template>
