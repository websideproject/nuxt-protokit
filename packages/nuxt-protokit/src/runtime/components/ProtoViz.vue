<script setup lang="ts">
import { computed } from 'vue'
import type { VizDef } from '../types/brick'
import type { ComputeContext } from '../types/compute'
import { useProtoExtensionRegistry } from '../composables/useProtoExtensionRegistry'

const props = defineProps<{
  viz: VizDef
  context: ComputeContext
}>()

const { getVizComponent } = useProtoExtensionRegistry()
const customVizComponent = computed(() => getVizComponent(props.viz.type))

const shouldShow = computed(() => {
  if (!props.viz.showWhen) return true
  return props.viz.showWhen(props.context)
})
</script>

<template>
  <div v-if="shouldShow">
    <h4
      v-if="viz.title"
      class="font-medium text-sm text-highlighted mb-2"
    >
      {{ viz.title }}
    </h4>

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

    <VizLineChart
      v-else-if="viz.type === 'line-chart'"
      :data="(viz.config as any).data(context)"
      :color="(viz.config as any).color"
      :show-axes="(viz.config as any).showAxes"
      :unit="(viz.config as any).unit"
      :empty-text="(viz.config as any).emptyText"
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

    <VizAreaChart
      v-else-if="viz.type === 'area-chart'"
      :series="(viz.config as any).series(context)"
      :show-axes="(viz.config as any).showAxes"
      :unit="(viz.config as any).unit"
      :empty-text="(viz.config as any).emptyText"
    />

    <VizPieChart
      v-else-if="viz.type === 'pie-chart' || viz.type === 'donut-chart'"
      :data="(viz.config as any).data(context)"
      :donut="viz.type === 'donut-chart'"
      :unit="(viz.config as any).unit"
      :show-legend="(viz.config as any).showLegend !== false"
      :empty-text="(viz.config as any).emptyText"
    />

    <VizFunnelChart
      v-else-if="viz.type === 'funnel-chart'"
      :data="(viz.config as any).data(context)"
      :unit="(viz.config as any).unit"
      :show-conversion="(viz.config as any).showConversion !== false"
    />

    <VizStatCards
      v-else-if="viz.type === 'stat-cards'"
      :cards="(viz.config as any).cards(context)"
      :cols="(viz.config as any).cols"
    />

    <component
      :is="customVizComponent"
      v-else-if="customVizComponent"
      :config="(viz as any).config"
      :context="context"
    />
  </div>
</template>
