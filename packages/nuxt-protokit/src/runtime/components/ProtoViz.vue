<script setup lang="ts">
import type { VizDef } from '../types/brick'
import type { ComputeContext } from '../types/compute'

const props = defineProps<{
  viz: VizDef
  context: ComputeContext
}>()

const shouldShow = computed(() => {
  if (!props.viz.showWhen) return true
  return props.viz.showWhen(props.context)
})
</script>

<template>
  <div v-if="shouldShow">
    <h4 v-if="viz.title" class="font-medium text-sm text-highlighted mb-2">{{ viz.title }}</h4>

    <VizProgressBar
      v-if="viz.type === 'progress'"
      :value="(viz.config as any).value(context)"
      :max="(viz.config as any).max"
      :label="(viz.config as any).label ? (viz.config as any).label(context) : undefined"
      :thresholds="(viz.config as any).thresholds"
    />

    <VizBenchmarkBar
      v-else-if="viz.type === 'benchmark'"
      :value="(viz.config as any).value(context)"
      :median="(viz.config as any).median"
      :min="(viz.config as any).min"
      :max="(viz.config as any).max"
      :label="(viz.config as any).label"
      :unit="(viz.config as any).unit"
    />

    <VizBarChart
      v-else-if="viz.type === 'bar-chart'"
      :data="(viz.config as any).data(context)"
      :max-value="(viz.config as any).maxValue"
      :unit="(viz.config as any).unit"
    />

    <VizComparisonTable
      v-else-if="viz.type === 'comparison-table'"
      :columns="(viz.config as any).columns"
      :rows="(viz.config as any).rows(context)"
    />

    <VizFeatureMatrix
      v-else-if="viz.type === 'feature-matrix'"
      :features="(viz.config as any).features"
      :entities="(viz.config as any).entities(context)"
    />

    <VizTimeline
      v-else-if="viz.type === 'timeline'"
      :items="(viz.config as any).items(context)"
    />
  </div>
</template>
