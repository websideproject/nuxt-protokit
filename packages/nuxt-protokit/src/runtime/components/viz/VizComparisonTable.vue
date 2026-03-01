<script setup lang="ts">
defineProps<{
  columns: Array<{ key: string; label: string }>
  rows: Array<Record<string, any>>
}>()
</script>

<template>
  <UTable
    v-if="rows.length > 0"
    :data="rows"
    :columns="columns.map(c => ({ accessorKey: c.key, header: c.label }))"
  />
  <div v-else class="text-center py-4 text-sm text-muted">
    No data to display.
  </div>
</template>
