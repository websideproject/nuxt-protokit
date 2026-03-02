<script setup lang="ts">
import type { PrototypeSchema, ComputeContext } from '#protokit/types'
import CustomPriorityField from '~/components/CustomPriorityField.vue'
import CustomGaugeViz from '~/components/CustomGaugeViz.vue'

// Register the extension before rendering
const ext = defineProtokitExtension({
  namespace: 'demo',
  fields: {
    priority: { component: CustomPriorityField },
  },
  vizTypes: {
    gauge: { component: CustomGaugeViz },
  },
})

const { registerExtension } = useProtoExtensionRegistry()
registerExtension(ext)

const schema: PrototypeSchema = {
  key: 'playground-custom-extensions',
  title: 'Custom Extensions',
  shortTitle: 'Extensions',
  description: 'Demonstrates custom field types and viz types registered via defineProtokitExtension.',
  icon: 'i-lucide-blocks',
  defaultCols: 2,

  fields: {
    name: {
      type: 'text',
      label: 'Project Name',
      default: 'My Project',
      placeholder: 'Enter project name',
    },
    priority: {
      // Custom field — rendered by CustomPriorityField.vue
      type: 'demo:priority',
      label: 'Priority',
      default: 'medium',
      props: { options: ['low', 'medium', 'high', 'critical'] },
    },
    progress: {
      type: 'range',
      label: 'Completion %',
      default: 40,
      min: 0,
      max: 100,
      step: 5,
      rangeLabels: { min: '0%', max: '100%' },
    },
    effort: {
      type: 'rating',
      label: 'Effort (1–5)',
      default: 3,
      max: 5,
    },
  },

  derived: {
    priorityWeight: {
      compute: ({ fields }: ComputeContext) => {
        const map: Record<string, number> = { low: 20, medium: 50, high: 75, critical: 100 }
        return map[fields.priority as string] ?? 50
      },
    },
    healthScore: {
      compute: ({ fields, derived }: ComputeContext) => {
        const effortPenalty = (fields.effort - 3) * 5
        return Math.round(
          derived.priorityWeight * 0.4
          + fields.progress * 0.5
          - effortPenalty * 0.1,
        )
      },
    },
  },

  results: [
    {
      title: 'Project Health',
      statCols: 3,
      badge: (ctx: ComputeContext) => {
        const s = ctx.derived.healthScore
        if (s >= 70) return { label: 'On Track', color: 'success' }
        if (s >= 40) return { label: 'At Risk', color: 'warning' }
        return { label: 'Needs Attention', color: 'error' }
      },
      stats: (ctx: ComputeContext) => [
        { label: 'Health Score', value: ctx.derived.healthScore, valueClass: 'text-primary' },
        { label: 'Priority Weight', value: `${ctx.derived.priorityWeight}%` },
        { label: 'Completion', value: `${ctx.fields.progress}%` },
      ],
    },
  ],

  visualizations: [
    {
      // Custom viz — rendered by CustomGaugeViz.vue
      type: 'demo:gauge',
      title: 'Health Score Gauge',
      config: {
        value: (ctx: ComputeContext) => ctx.derived.healthScore,
        max: 100,
        label: 'Combined health score',
      },
    },
  ],
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-8">
    <!-- Info banner -->
    <div class="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <UIcon
        name="i-lucide-blocks"
        class="size-4 text-primary mt-0.5 shrink-0"
      />
      <div class="text-sm text-muted leading-relaxed">
        This page registers a <code class="text-xs bg-muted px-1 py-0.5 rounded">demo:priority</code> field
        and a <code class="text-xs bg-muted px-1 py-0.5 rounded">demo:gauge</code> viz via
        <code class="text-xs bg-muted px-1 py-0.5 rounded">defineProtokitExtension</code>.
        Neither modifies the module source.
      </div>
    </div>

    <ClientOnly>
      <ProtoTool
        :schema="schema"
        disable-sync
      />
      <template #fallback>
        <div class="space-y-4 animate-pulse">
          <div class="h-10 bg-muted rounded" />
          <div class="h-10 bg-muted rounded" />
          <div class="h-24 bg-muted rounded" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
