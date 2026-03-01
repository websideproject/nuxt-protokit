<script setup lang="ts">
import type { PrototypeSchema, ComputeContext } from '#protokit/types'
import { formatMoney } from '#protokit/utils/formatters'

const schema: PrototypeSchema = {
  key: 'playground-saas-dashboard',
  title: 'SaaS Metrics Dashboard',
  shortTitle: 'Dashboard',
  description: 'Track your key SaaS metrics.',
  icon: 'i-lucide-layout-dashboard',
  defaultCols: 2,

  fields: {
    mrr: { type: 'number', label: 'Monthly Recurring Revenue', default: 12000, leading: '$' },
    customers: { type: 'number', label: 'Total Customers', default: 150 },
    churnRate: { type: 'number', label: 'Monthly Churn Rate', default: 3.5, trailing: '%', step: 0.1 },
    arpu: { type: 'number', label: 'ARPU', default: 80, leading: '$' },
    cac: { type: 'number', label: 'Customer Acquisition Cost', default: 250, leading: '$' },
    growthRate: { type: 'number', label: 'Monthly Growth', default: 8, trailing: '%', step: 0.5 },
  },

  derived: {
    arr: { compute: (ctx: ComputeContext) => ctx.fields.mrr * 12 },
    ltv: {
      compute: (ctx: ComputeContext) => {
        if (ctx.fields.churnRate <= 0) return Infinity
        return ctx.fields.arpu / (ctx.fields.churnRate / 100)
      },
    },
    ltvCacRatio: {
      compute: (ctx: ComputeContext) => {
        if (ctx.fields.cac <= 0) return Infinity
        return ctx.derived.ltv / ctx.fields.cac
      },
    },
    monthsToPayback: {
      compute: (ctx: ComputeContext) => {
        if (ctx.fields.arpu <= 0) return Infinity
        return Math.ceil(ctx.fields.cac / ctx.fields.arpu)
      },
    },
    quickRatio: {
      compute: (ctx: ComputeContext) => {
        const churnRevenue = ctx.fields.mrr * (ctx.fields.churnRate / 100)
        const newRevenue = ctx.fields.mrr * (ctx.fields.growthRate / 100)
        if (churnRevenue <= 0) return Infinity
        return newRevenue / churnRevenue
      },
    },
  },

  results: [
    {
      title: 'Key Metrics',
      statCols: 4,
      stats: (ctx: ComputeContext) => [
        { label: 'ARR', value: formatMoney(ctx.derived.arr), valueClass: 'text-primary' },
        { label: 'LTV', value: formatMoney(ctx.derived.ltv) },
        {
          label: 'LTV:CAC',
          value: ctx.derived.ltvCacRatio === Infinity ? '∞' : `${ctx.derived.ltvCacRatio.toFixed(1)}x`,
          valueClass: ctx.derived.ltvCacRatio >= 3 ? 'text-emerald-600' : 'text-amber-500',
        },
        {
          label: 'Quick Ratio',
          value: ctx.derived.quickRatio === Infinity ? '∞' : ctx.derived.quickRatio.toFixed(2),
          valueClass: ctx.derived.quickRatio >= 4 ? 'text-emerald-600' : 'text-amber-500',
        },
      ],
    },
  ],

  cards: [
    {
      title: 'Growth Health',
      icon: 'i-lucide-trending-up',
      badge: (ctx: ComputeContext) => {
        if (ctx.derived.quickRatio >= 4) return { label: 'Excellent', color: 'success' }
        if (ctx.derived.quickRatio >= 2) return { label: 'Good', color: 'warning' }
        return { label: 'Needs Work', color: 'error' }
      },
      stats: (ctx: ComputeContext) => [
        { label: 'Growth Rate', value: `${ctx.fields.growthRate}%` },
        { label: 'Payback (mo)', value: ctx.derived.monthsToPayback === Infinity ? '∞' : String(ctx.derived.monthsToPayback) },
      ],
    },
    {
      title: 'Retention',
      icon: 'i-lucide-shield-check',
      badge: (ctx: ComputeContext) => {
        if (ctx.fields.churnRate <= 2) return { label: 'Healthy', color: 'success' }
        if (ctx.fields.churnRate <= 5) return { label: 'Moderate', color: 'warning' }
        return { label: 'High Churn', color: 'error' }
      },
      stats: (ctx: ComputeContext) => [
        { label: 'Churn Rate', value: `${ctx.fields.churnRate}%` },
        { label: 'Retained', value: `${(100 - ctx.fields.churnRate).toFixed(1)}%` },
      ],
    },
  ],

  visualizations: [
    {
      type: 'benchmark',
      title: 'LTV:CAC Benchmark',
      config: {
        type: 'benchmark',
        value: (ctx: ComputeContext) => Math.min(10, ctx.derived.ltvCacRatio === Infinity ? 10 : ctx.derived.ltvCacRatio),
        median: 3,
        min: 0,
        max: 10,
        label: 'LTV:CAC Ratio',
        unit: 'x',
      },
    },
  ],

  layout: {
    rows: [
      { cols: 1, items: [{ type: 'form', span: 1 }] },
      { cols: 1, items: [{ type: 'stats', resultIndex: 0, span: 1 }] },
      { cols: 2, items: [{ type: 'card', cardIndex: 0 }, { type: 'card', cardIndex: 1 }] },
      { cols: 1, items: [{ type: 'viz', vizIndex: 0, span: 1 }] },
    ],
  },
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 py-8">
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
