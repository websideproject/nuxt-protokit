<script setup lang="ts">
import type { PrototypeSchema, ComputeContext } from '#protokit/types'
import { formatMoney } from '#protokit/utils/formatters'

const schema: PrototypeSchema = {
  key: 'playground-break-even',
  title: 'Break-Even Calculator',
  description: 'Calculate how many units you need to sell to break even.',
  icon: 'i-lucide-target',
  tags: ['finance', 'planning'],
  defaultCols: 2,

  fields: {
    fixedCosts: {
      type: 'number',
      label: 'Fixed Costs',
      default: 5000,
      leading: '$',
      trailing: '/mo',
      placeholder: 'Monthly fixed costs',
      help: 'Rent, salaries, subscriptions, etc.',
    },
    pricePerUnit: {
      type: 'number',
      label: 'Price per Unit',
      default: 99,
      leading: '$',
      placeholder: 'Selling price',
    },
    costPerUnit: {
      type: 'number',
      label: 'Cost per Unit',
      default: 20,
      leading: '$',
      placeholder: 'Variable cost per unit',
    },
    expectedUnits: {
      type: 'number',
      label: 'Expected Monthly Sales',
      default: 100,
      trailing: 'units',
      placeholder: 'Expected units sold per month',
    },
    confidence: {
      type: 'range',
      label: 'Confidence Level',
      default: 70,
      min: 0,
      max: 100,
      step: 5,
      rangeLabels: { min: 'Low', max: 'High' },
    },
  },

  derived: {
    contributionMargin: {
      compute: (ctx: ComputeContext) => ctx.fields.pricePerUnit - ctx.fields.costPerUnit,
    },
    breakEvenUnits: {
      compute: (ctx: ComputeContext) => {
        const margin = ctx.derived.contributionMargin
        if (margin <= 0) return Infinity
        return Math.ceil(ctx.fields.fixedCosts / margin)
      },
    },
    breakEvenRevenue: {
      compute: (ctx: ComputeContext) => {
        if (ctx.derived.breakEvenUnits === Infinity) return Infinity
        return ctx.derived.breakEvenUnits * ctx.fields.pricePerUnit
      },
    },
    profitAtExpected: {
      compute: (ctx: ComputeContext) =>
        (ctx.fields.expectedUnits * ctx.derived.contributionMargin) - ctx.fields.fixedCosts,
    },
    progressPercent: {
      compute: (ctx: ComputeContext) => {
        if (ctx.derived.breakEvenUnits === Infinity || ctx.derived.breakEvenUnits === 0) return 0
        return Math.min(100, (ctx.fields.expectedUnits / ctx.derived.breakEvenUnits) * 100)
      },
    },
  },

  results: [
    {
      title: 'Break-Even Analysis',
      statCols: 4,
      badge: (ctx: ComputeContext) => {
        if (ctx.derived.profitAtExpected > 0) return { label: 'Profitable', color: 'success' }
        if (ctx.derived.profitAtExpected === 0) return { label: 'Break-Even', color: 'warning' }
        return { label: 'Unprofitable', color: 'error' }
      },
      stats: (ctx: ComputeContext) => [
        {
          label: 'Break-Even Units',
          value: ctx.derived.breakEvenUnits === Infinity ? 'N/A' : String(ctx.derived.breakEvenUnits),
          valueClass: 'text-primary',
        },
        {
          label: 'Break-Even Revenue',
          value: formatMoney(ctx.derived.breakEvenRevenue),
        },
        {
          label: 'Contribution Margin',
          value: formatMoney(ctx.derived.contributionMargin),
          valueClass: ctx.derived.contributionMargin > 0 ? 'text-emerald-600' : 'text-red-500',
        },
        {
          label: 'Monthly Profit',
          value: formatMoney(ctx.derived.profitAtExpected),
          valueClass: ctx.derived.profitAtExpected >= 0 ? 'text-emerald-600' : 'text-red-500',
        },
      ],
    },
  ],

  visualizations: [
    {
      type: 'progress',
      title: 'Progress to Break-Even',
      config: {
        type: 'progress',
        value: (ctx: ComputeContext) => ctx.derived.progressPercent,
        max: 100,
        label: (ctx: ComputeContext) =>
          `${ctx.fields.expectedUnits} of ${ctx.derived.breakEvenUnits === Infinity ? '∞' : ctx.derived.breakEvenUnits} units`,
        thresholds: [
          { value: 0, color: 'bg-red-500', label: 'Below break-even' },
          { value: 50, color: 'bg-amber-500', label: 'Halfway there' },
          { value: 100, color: 'bg-emerald-500', label: 'Break-even reached!' },
        ],
      },
    },
  ],
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-8">
      <ClientOnly>
        <ProtoTool :schema="schema" disable-sync />
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
