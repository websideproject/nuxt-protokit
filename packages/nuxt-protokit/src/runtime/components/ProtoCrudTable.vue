<script setup lang="ts">
import type { CollectionSchema } from '../types/schema'
import { applyFormat } from '../utils/formatters'

const props = withDefaults(defineProps<{
  schema: CollectionSchema
  items?: any[]
  columns?: CollectionSchema['tableColumns']
}>(), {
  items: () => [],
})

const emit = defineEmits<{
  update: [index: number, item: any]
  remove: [index: number]
}>()

// Build columns from schema if not provided
const tableColumns = computed(() => {
  if (props.columns && props.columns.length > 0) return props.columns
  if (props.schema.tableColumns && props.schema.tableColumns.length > 0) return props.schema.tableColumns
  // Auto-generate from fields
  return Object.entries(props.schema.fields).map(([key, def]) => ({
    key,
    label: typeof def.label === 'string' ? def.label : key,
  }))
})

// Build table rows with formatted values
const rows = computed(() => {
  return props.items.map((item, index) => {
    const row: Record<string, any> = { _index: index }
    for (const col of tableColumns.value) {
      const fieldDef = props.schema.fields[col.key]
      const raw = item[col.key]
      row[col.key] = (col as any).format ? applyFormat(raw, (col as any).format) : ((fieldDef as any)?.format ? applyFormat(raw, (fieldDef as any).format) : raw)
    }
    return row
  })
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <UIcon
          v-if="schema.icon"
          :name="schema.icon"
          class="size-5 text-muted"
        />
        <h3 class="font-semibold">
          {{ schema.title }}
        </h3>
        <UBadge
          variant="subtle"
          size="sm"
        >
          {{ items.length }}
        </UBadge>
      </div>
    </div>

    <UTable
      v-if="items.length > 0"
      :data="rows"
      :columns="tableColumns.map(c => ({ accessorKey: c.key, header: c.label }))"
    />

    <div
      v-else
      class="text-center py-8 text-muted"
    >
      <p class="text-sm">
        No data to display.
      </p>
    </div>
  </div>
</template>
