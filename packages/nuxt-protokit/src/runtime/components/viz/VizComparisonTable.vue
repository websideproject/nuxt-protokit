<script setup>
defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
})
</script>

<template>
  <UTable
    v-if="rows.length > 0"
    :data="rows"
    :columns="columns.map((c) => ({ accessorKey: c.key, header: c.label }))"
  />
  <div
    v-else
    class="text-center py-4 text-sm text-muted"
  >
    No data to display.
  </div>
</template>
