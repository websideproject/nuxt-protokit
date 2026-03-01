<script setup lang="ts">
import type { PrototypeSchema, ComputeContext } from '#protokit/types'

// From the Quick Start docs
const schema: PrototypeSchema = {
  key: 'playground-resource-estimator',
  title: 'Resource Cost Estimator',
  description: 'Estimate total project cost based on team size, salaries, and duration.',
  icon: 'i-lucide-calculator',
  tags: ['finance', 'planning'],

  fields: {
    teamSize: {
      type: 'number',
      label: 'Team Size',
      default: 3,
      trailing: 'people',
    },
    avgMonthlySalary: {
      type: 'number',
      label: 'Avg. Monthly Salary (€)',
      default: 4500,
      leading: '€',
    },
    toolingCosts: {
      type: 'number',
      label: 'Monthly Tooling Budget (€)',
      default: 300,
      leading: '€',
    },
    projectDurationMonths: {
      type: 'range',
      label: 'Project Duration (months)',
      min: 1,
      max: 24,
      step: 1,
      default: 6,
    },
    overheadPercent: {
      type: 'range',
      label: 'Overhead / Benefits (%)',
      min: 0,
      max: 60,
      step: 5,
      default: 25,
    },
  },

  derived: {
    monthlySalaryCost: {
      compute: ({ fields }: ComputeContext) => fields.teamSize * fields.avgMonthlySalary,
      format: { type: 'money', currency: '€' },
    },
    monthlyOverhead: {
      compute: ({ fields, derived }: ComputeContext) =>
        derived.monthlySalaryCost * (fields.overheadPercent / 100),
      format: { type: 'money', currency: '€' },
    },
    monthlyTotal: {
      compute: ({ fields, derived }: ComputeContext) =>
        derived.monthlySalaryCost + derived.monthlyOverhead + fields.toolingCosts,
      format: { type: 'money', currency: '€' },
    },
    projectTotal: {
      compute: ({ fields, derived }: ComputeContext) =>
        derived.monthlyTotal * fields.projectDurationMonths,
      format: { type: 'money', currency: '€' },
    },
  },

  results: [
    {
      title: 'Cost Summary',
      statCols: 4,
      badge: ({ derived }: ComputeContext) => {
        const cost = derived.projectTotal
        if (cost < 50_000) return { label: 'Small Project', color: 'primary' }
        if (cost < 200_000) return { label: 'Medium Project', color: 'warning' }
        return { label: 'Large Project', color: 'error' }
      },
      stats: ({ derived }: ComputeContext) => [
        { label: 'Monthly People Cost', value: derived.monthlySalaryCost },
        { label: 'Monthly Overhead', value: derived.monthlyOverhead },
        { label: 'Monthly Total', value: derived.monthlyTotal },
        { label: 'Project Total', value: derived.projectTotal },
      ],
    },
  ],

  visualizations: [
    {
      type: 'bar-chart',
      title: 'Monthly Cost Breakdown',
      config: {
        type: 'bar-chart',
        data: ({ fields, derived }: ComputeContext) => [
          { label: 'Salaries', value: derived.monthlySalaryCost },
          { label: 'Overhead', value: derived.monthlyOverhead },
          { label: 'Tooling', value: fields.toolingCosts },
        ],
        unit: '€',
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
