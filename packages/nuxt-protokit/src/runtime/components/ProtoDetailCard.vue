<script setup>
import { computed } from 'vue'
import { applyFormat } from '../utils/formatters'

const props = defineProps({
  fields: { type: Object, required: true },
  data: { type: Object, required: true },
  cols: { type: Number, required: false, default: 2 },
  title: { type: String, required: false },
})
const gridClass = computed(() => {
  const colMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
  }
  return `grid ${colMap[props.cols] || 'grid-cols-2'} gap-3`
})
function getLabel(key, fieldDef) {
  if (typeof fieldDef.label === 'function') return fieldDef.label(props.data[key])
  return fieldDef.label
}
</script>

<template>
  <UCard>
    <template
      v-if="title"
      #header
    >
      <h3 class="font-semibold">
        {{ title }}
      </h3>
    </template>
    <div :class="gridClass">
      <div
        v-for="(fieldDef, key) in fields"
        :key="key"
        class="space-y-0.5"
      >
        <div class="text-xs text-muted">
          {{ getLabel(key, fieldDef) }}
        </div>
        <div class="font-medium text-highlighted">
          {{ applyFormat(data[key], fieldDef.format) }}
        </div>
      </div>
    </div>
  </UCard>
</template>
