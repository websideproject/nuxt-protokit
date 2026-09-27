<script setup>
import { computed } from 'vue'
import { applyFormat } from '../utils/formatters'

const props = defineProps({
  schema: { type: Object, required: true },
  items: { type: Array, required: false, default: () => [] },
  columns: { type: Array, required: false },
})
const emit = defineEmits(['update', 'remove'])
const tableColumns = computed(() => {
  if (props.columns && props.columns.length > 0) return props.columns
  if (props.schema.tableColumns && props.schema.tableColumns.length > 0) return props.schema.tableColumns
  return Object.entries(props.schema.fields).map(([key, def]) => ({
    key,
    label: typeof def.label === 'string' ? def.label : key,
  }))
})
const rows = computed(() => {
  return props.items.map((item, index) => {
    const row = { _index: index }
    for (const col of tableColumns.value) {
      const fieldDef = props.schema.fields[col.key]
      const raw = item[col.key]
      row[col.key] = col.format ? applyFormat(raw, col.format) : fieldDef?.format ? applyFormat(raw, fieldDef.format) : raw
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
      :columns="tableColumns.map((c) => ({ accessorKey: c.key, header: c.label }))"
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
