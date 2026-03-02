<script setup lang="ts">
import type { PrototypeSchema, ComputeContext } from '#protokit/types'
import { formatMoney } from '#protokit/utils/formatters'

const SHARED_DOC_KEY = 'playground-sync-shared'

const schema: PrototypeSchema = {
  key: SHARED_DOC_KEY,
  title: 'Break-Even Calculator',
  shortTitle: 'Tab Sync',
  description: 'Calculate how many units you need to sell to break even.',
  icon: 'i-lucide-target',
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
    expectedUnits: {
      type: 'number',
      label: 'Expected Monthly Sales',
      default: 100,
      trailing: 'units',
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
    profitAtExpected: {
      compute: (ctx: ComputeContext) =>
        (ctx.fields.expectedUnits * ctx.derived.contributionMargin) - ctx.fields.fixedCosts,
    },
  },

  results: [
    {
      title: 'Break-Even Analysis',
      statCols: 2,
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
          label: 'Monthly Profit',
          value: formatMoney(ctx.derived.profitAtExpected),
          valueClass: ctx.derived.profitAtExpected >= 0 ? 'text-emerald-600' : 'text-red-500',
        },
      ],
    },
  ],
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-8 space-y-6">
    <UAlert
      icon="i-lucide-info"
      color="info"
      variant="subtle"
      title="How this works"
      description="Both instances below use the same Y.js document key. Edits in one are instantly reflected in the other via BroadcastChannel — no server required. Open this page in two browser tabs to see cross-tab sync."
    />

    <ClientOnly>
      <div class="grid md:grid-cols-2 gap-4">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UBadge
                variant="subtle"
                color="info"
              >
                Instance A
              </UBadge>
              <span class="text-sm text-muted">Shared doc: {{ SHARED_DOC_KEY }}</span>
            </div>
          </template>
          <ProtoTool
            :schema="schema"
            :doc-key="SHARED_DOC_KEY"
            disable-sync
          />
        </UCard>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UBadge
                variant="subtle"
                color="success"
              >
                Instance B
              </UBadge>
              <span class="text-sm text-muted">Same shared doc</span>
            </div>
          </template>
          <ProtoTool
            :schema="schema"
            :doc-key="SHARED_DOC_KEY"
            disable-sync
          />
        </UCard>
      </div>
      <template #fallback>
        <div class="grid md:grid-cols-2 gap-4">
          <div class="h-64 bg-muted rounded animate-pulse" />
          <div class="h-64 bg-muted rounded animate-pulse" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
