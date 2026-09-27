<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  panelDef: { type: Object, required: true },
  item: { type: Object, required: true },
  collections: { type: Object, required: true },
})
const emit = defineEmits(['update'])
const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
const snapshotDate = ref(today)
const metricValues = ref({})
const visibleMetrics = computed(
  () => props.panelDef.metrics.filter(m => !m.showWhen || m.showWhen(props.item)),
)
function initMetrics() {
  const vals = {}
  for (const m of visibleMetrics.value) {
    vals[m.key] = props.item[m.key] ?? 0
  }
  metricValues.value = vals
}
initMetrics()
const history = computed(() => {
  const raw = props.item[props.panelDef.historyKey]
  if (!Array.isArray(raw)) return []
  return [...raw].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 7)
})
function saveSnapshot() {
  const snapshot = { date: snapshotDate.value }
  const topLevelPatch = {}
  for (const m of visibleMetrics.value) {
    const val = metricValues.value[m.key] ?? 0
    snapshot[m.key] = val
    topLevelPatch[m.key] = val
  }
  const existingHistory = Array.isArray(props.item[props.panelDef.historyKey]) ? [...props.item[props.panelDef.historyKey]] : []
  const idx = existingHistory.findIndex(h => h.date === snapshotDate.value)
  if (idx >= 0) {
    existingHistory[idx] = snapshot
  }
  else {
    existingHistory.push(snapshot)
  }
  emit('update', {
    ...topLevelPatch,
    [props.panelDef.historyKey]: existingHistory,
  })
}
</script>

<template>
  <div class="border-t border-default px-3 py-3 space-y-4 bg-muted/30">
    <!-- Date + metric inputs -->
    <div class="flex flex-wrap gap-3 items-end">
      <div class="flex flex-col gap-1 min-w-[140px]">
        <label class="text-xs text-muted font-medium">Date</label>
        <UInput
          v-model="snapshotDate"
          type="date"
          size="sm"
        />
      </div>
      <div
        v-for="metric in visibleMetrics"
        :key="metric.key"
        class="flex flex-col gap-1 min-w-[100px]"
      >
        <label class="text-xs text-muted font-medium">{{ metric.label }}</label>
        <UInput
          v-model.number="metricValues[metric.key]"
          type="number"
          size="sm"
          :min="0"
        />
      </div>
      <UButton
        size="sm"
        icon="i-lucide-save"
        @click="saveSnapshot"
      >
        Save Snapshot
      </UButton>
    </div>

    <!-- History table -->
    <div
      v-if="history.length > 0"
      class="overflow-x-auto"
    >
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-default">
            <th class="text-left py-1 pr-3 text-muted font-medium">
              Date
            </th>
            <th
              v-for="metric in visibleMetrics"
              :key="metric.key"
              class="text-right py-1 px-2 text-muted font-medium"
            >
              {{ metric.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(snap, i) in history"
            :key="i"
            class="border-b border-default/50 last:border-0"
          >
            <td class="py-1 pr-3 text-highlighted">
              {{ snap.date }}
            </td>
            <td
              v-for="metric in visibleMetrics"
              :key="metric.key"
              class="py-1 px-2 text-right tabular-nums"
            >
              {{ snap[metric.key] ?? "\u2014" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p
      v-else
      class="text-xs text-muted italic"
    >
      No snapshots yet. Add your first data point above.
    </p>
  </div>
</template>
