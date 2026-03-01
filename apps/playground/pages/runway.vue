<script setup lang="ts">
import type { PrototypeSchema, ComputeContext } from '#protokit/types'
import { formatMoney } from '#protokit/utils/formatters'

const schema: PrototypeSchema = {
  key: 'playground-runway',
  title: 'Personal Runway Calculator',
  description: 'How long can you sustain yourself while building your startup?',
  icon: 'i-lucide-plane-takeoff',
  defaultCols: 2,

  fields: {
    savings: { type: 'number', label: 'Total Savings', default: 50000, leading: '$' },
    investments: { type: 'number', label: 'Liquid Investments', default: 10000, leading: '$' },
    otherIncome: { type: 'number', label: 'Other Monthly Income', default: 0, leading: '$', trailing: '/mo', help: 'Freelance, part-time, etc.' },
    rent: { type: 'number', label: 'Rent / Mortgage', default: 1500, leading: '$', trailing: '/mo' },
    food: { type: 'number', label: 'Food & Groceries', default: 500, leading: '$', trailing: '/mo' },
    utilities: { type: 'number', label: 'Utilities & Internet', default: 200, leading: '$', trailing: '/mo' },
    insurance: { type: 'number', label: 'Insurance', default: 300, leading: '$', trailing: '/mo' },
    transport: { type: 'number', label: 'Transport', default: 150, leading: '$', trailing: '/mo' },
    subscriptions: { type: 'number', label: 'Subscriptions', default: 100, leading: '$', trailing: '/mo' },
    other: { type: 'number', label: 'Other Expenses', default: 200, leading: '$', trailing: '/mo' },
    saasTooling: { type: 'number', label: 'SaaS Tooling', default: 100, leading: '$', trailing: '/mo', help: 'Hosting, APIs, etc.' },
    marketing: { type: 'number', label: 'Marketing Budget', default: 50, leading: '$', trailing: '/mo' },
    cushion: { type: 'range', label: 'Safety Cushion', default: 20, min: 0, max: 50, step: 5, trailing: '%', rangeLabels: { min: '0%', max: '50%' } },
  },

  sections: [
    {
      title: 'Available Funds',
      icon: 'i-lucide-wallet',
      fields: ['savings', 'investments', 'otherIncome'],
      cols: 3,
    },
    {
      title: 'Living Expenses',
      icon: 'i-lucide-home',
      fields: ['rent', 'food', 'utilities', 'insurance', 'transport', 'subscriptions', 'other'],
      cols: 4,
    },
    {
      title: 'Business Costs',
      icon: 'i-lucide-briefcase',
      fields: ['saasTooling', 'marketing'],
      cols: 2,
    },
    {
      title: 'Settings',
      icon: 'i-lucide-settings',
      fields: ['cushion'],
      cols: 1,
    },
  ],

  derived: {
    totalFunds: {
      compute: (ctx: ComputeContext) => ctx.fields.savings + ctx.fields.investments,
    },
    monthlyBurn: {
      compute: (ctx: ComputeContext) =>
        ctx.fields.rent + ctx.fields.food + ctx.fields.utilities + ctx.fields.insurance
        + ctx.fields.transport + ctx.fields.subscriptions + ctx.fields.other
        + ctx.fields.saasTooling + ctx.fields.marketing,
    },
    netBurn: {
      compute: (ctx: ComputeContext) => ctx.derived.monthlyBurn - ctx.fields.otherIncome,
    },
    runwayMonths: {
      compute: (ctx: ComputeContext) => {
        if (ctx.derived.netBurn <= 0) return Infinity
        const cushionMultiplier = 1 + (ctx.fields.cushion / 100)
        return Math.floor(ctx.derived.totalFunds / (ctx.derived.netBurn * cushionMultiplier))
      },
    },
    runwayDate: {
      compute: (ctx: ComputeContext) => {
        if (ctx.derived.runwayMonths === Infinity) return 'Indefinite'
        const d = new Date()
        d.setMonth(d.getMonth() + ctx.derived.runwayMonths)
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      },
    },
  },

  results: [
    {
      title: 'Runway Summary',
      statCols: 4,
      badge: (ctx: ComputeContext) => {
        const months = ctx.derived.runwayMonths
        if (months === Infinity) return { label: 'Sustainable', color: 'success' }
        if (months >= 18) return { label: 'Comfortable', color: 'success' }
        if (months >= 12) return { label: 'Moderate', color: 'warning' }
        if (months >= 6) return { label: 'Tight', color: 'warning' }
        return { label: 'Critical', color: 'error' }
      },
      stats: (ctx: ComputeContext) => [
        {
          label: 'Runway',
          value: ctx.derived.runwayMonths === Infinity ? '∞' : `${ctx.derived.runwayMonths} months`,
          valueClass: 'text-primary',
        },
        { label: 'Runs Out', value: ctx.derived.runwayDate },
        { label: 'Monthly Burn', value: formatMoney(ctx.derived.netBurn) },
        { label: 'Total Funds', value: formatMoney(ctx.derived.totalFunds) },
      ],
    },
  ],
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
