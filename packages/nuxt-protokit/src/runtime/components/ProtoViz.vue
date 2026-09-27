<script setup>
import { computed } from 'vue'
import { useProtoExtensionRegistry } from '../composables/useProtoExtensionRegistry'

const props = defineProps({
  viz: { type: Object, required: true },
  context: { type: Object, required: true },
})
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
      :value="viz.config.value(context)"
      :max="viz.config.max"
      :label="viz.config.label ? viz.config.label(context) : void 0"
      :thresholds="viz.config.thresholds"
    />

    <VizBenchmarkBar
      v-else-if="viz.type === 'benchmark'"
      :value="viz.config.value(context)"
      :median="viz.config.median"
      :min="viz.config.min"
      :max="viz.config.max"
      :label="viz.config.label"
      :unit="viz.config.unit"
    />

    <VizBarChart
      v-else-if="viz.type === 'bar-chart'"
      :data="viz.config.data(context)"
      :max-value="viz.config.maxValue"
      :unit="viz.config.unit"
    />

    <VizLineChart
      v-else-if="viz.type === 'line-chart'"
      :data="viz.config.data(context)"
      :color="viz.config.color"
      :show-axes="viz.config.showAxes"
      :unit="viz.config.unit"
      :empty-text="viz.config.emptyText"
    />

    <VizComparisonTable
      v-else-if="viz.type === 'comparison-table'"
      :columns="viz.config.columns"
      :rows="viz.config.rows(context)"
    />

    <VizFeatureMatrix
      v-else-if="viz.type === 'feature-matrix'"
      :features="viz.config.features"
      :entities="viz.config.entities(context)"
    />

    <VizTimeline
      v-else-if="viz.type === 'timeline'"
      :items="viz.config.items(context)"
    />

    <VizAreaChart
      v-else-if="viz.type === 'area-chart'"
      :series="viz.config.series(context)"
      :show-axes="viz.config.showAxes"
      :unit="viz.config.unit"
      :empty-text="viz.config.emptyText"
    />

    <VizPieChart
      v-else-if="viz.type === 'pie-chart' || viz.type === 'donut-chart'"
      :data="viz.config.data(context)"
      :donut="viz.type === 'donut-chart'"
      :unit="viz.config.unit"
      :show-legend="viz.config.showLegend !== false"
      :empty-text="viz.config.emptyText"
    />

    <VizFunnelChart
      v-else-if="viz.type === 'funnel-chart'"
      :data="viz.config.data(context)"
      :unit="viz.config.unit"
      :show-conversion="viz.config.showConversion !== false"
    />

    <VizStatCards
      v-else-if="viz.type === 'stat-cards'"
      :cards="viz.config.cards(context)"
      :cols="viz.config.cols"
    />

    <component
      :is="customVizComponent"
      v-else-if="customVizComponent"
      :config="viz.config"
      :context="context"
    />
  </div>
</template>
