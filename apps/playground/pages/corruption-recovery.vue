<script setup lang="ts">
import type { PrototypeSchema, ComputeContext } from '#protokit/types'
import { formatMoney } from '#protokit/utils/formatters'

// Same doc key shared with the break-even page to allow testing corruption on that document
const DOC_KEY = 'playground-break-even'

const schema: PrototypeSchema = {
  key: DOC_KEY,
  title: 'Corruption Recovery Test',
  shortTitle: 'Recovery Test',
  description: 'Inject garbage into IndexedDB on the break-even page, then come here to trigger recovery.',
  icon: 'i-lucide-database-zap',
  tags: ['demo'],
  defaultCols: 2,

  fields: {
    fixedCosts: {
      type: 'number',
      label: 'Fixed Costs',
      default: 5000,
      leading: '$',
      trailing: '/mo',
    },
    pricePerUnit: {
      type: 'number',
      label: 'Price per Unit',
      default: 99,
      leading: '$',
    },
    costPerUnit: {
      type: 'number',
      label: 'Cost per Unit',
      default: 20,
      leading: '$',
    },
  },

  derived: {
    margin: {
      compute: (ctx: ComputeContext) => ctx.fields.pricePerUnit - ctx.fields.costPerUnit,
    },
    breakEven: {
      compute: (ctx: ComputeContext) => {
        const m = ctx.derived.margin
        if (m <= 0) return Infinity
        return Math.ceil(ctx.fields.fixedCosts / m)
      },
    },
  },

  results: [
    {
      title: 'Results',
      statCols: 2,
      stats: (ctx: ComputeContext) => [
        {
          label: 'Contribution Margin',
          value: formatMoney(ctx.derived.margin),
          valueClass: ctx.derived.margin > 0 ? 'text-emerald-600' : 'text-red-500',
        },
        {
          label: 'Break-Even Units',
          value: ctx.derived.breakEven === Infinity ? '∞' : String(ctx.derived.breakEven),
          valueClass: ctx.derived.breakEven < 200 ? 'text-emerald-600' : 'text-amber-500',
        },
      ],
    },
  ],
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-8 space-y-6">
    <UAlert
      icon="i-lucide-info"
      color="neutral"
      variant="subtle"
      title="How to test corruption recovery"
      description="1. Go to the Break-Even page and click 'Inject Garbage into IndexedDB'. 2. Navigate away (to any other page). 3. Come back here — ProtoTool will try to open the corrupt IndexedDB and trigger the recovery modal."
    />

    <ClientOnly>
      <ProtoTool
        :schema="schema"
        :doc-key="DOC_KEY"
        disable-sync
      />
      <template #fallback>
        <div class="space-y-4 animate-pulse">
          <div class="h-10 bg-muted rounded" />
          <div class="h-10 bg-muted rounded" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
