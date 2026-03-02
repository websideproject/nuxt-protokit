<script setup lang="ts">
import type { FieldDef } from '#protokit/types'

const galleryFields: Record<string, FieldDef> = {
  textField: { type: 'text', label: 'Text Input', default: 'Hello world', placeholder: 'Type something...' },
  numberField: { type: 'number', label: 'Number', default: 42, leading: '#' },
  selectField: {
    type: 'select',
    label: 'Select',
    default: 'option-a',
    options: [
      { label: 'Option A', value: 'option-a' },
      { label: 'Option B', value: 'option-b' },
      { label: 'Option C', value: 'option-c' },
    ],
  },
  rangeField: { type: 'range', label: 'Range', default: 50, min: 0, max: 100, step: 1, rangeLabels: { min: '0', max: '100' } },
  tagsField: { type: 'tags', label: 'Tags', default: ['vue', 'nuxt'], placeholder: 'Add a tag...' },
  toggleField: { type: 'toggle', label: 'Toggle', default: true },
  segmentedField: { type: 'segmented', label: 'Segmented', default: 'monthly', options: ['monthly', 'yearly'] },
  ratingField: { type: 'rating', label: 'Rating', default: 4, max: 5 },
  dateField: { type: 'date', label: 'Date', default: '' },
  colorField: { type: 'color', label: 'Color', default: '#6366f1' },
  textareaField: { type: 'textarea', label: 'Textarea', default: '', placeholder: 'Write something longer...' },
}

// Gallery state — each field has its own ref
const galleryState: Record<string, ReturnType<typeof ref>> = {}
for (const [key, def] of Object.entries(galleryFields)) {
  galleryState[key] = ref(def.default)
}

const sampleStats = [
  { label: 'Revenue', value: '$12.5K', valueClass: 'text-primary' },
  { label: 'Customers', value: '150' },
  { label: 'Churn', value: '3.5%', valueClass: 'text-amber-500' },
  { label: 'Growth', value: '+8%', valueClass: 'text-emerald-600' },
]

const sampleTimeline = [
  { title: 'Idea Validated', status: 'done' as const, date: 'Jan 2026', description: 'Completed customer interviews' },
  { title: 'MVP Launched', status: 'done' as const, date: 'Mar 2026', description: 'Core features shipped' },
  { title: 'First Paying Customer', status: 'current' as const, date: 'Apr 2026', description: 'Converting beta users' },
  { title: 'Product-Market Fit', status: 'upcoming' as const, date: 'Q3 2026' },
  { title: 'Series A', status: 'upcoming' as const, date: 'Q1 2027' },
]

const sampleBarData = [
  { label: 'Organic', value: 450, color: 'bg-emerald-500' },
  { label: 'Paid Ads', value: 320, color: 'bg-blue-500' },
  { label: 'Referral', value: 280, color: 'bg-purple-500' },
  { label: 'Social', value: 180, color: 'bg-pink-500' },
]

const sampleFeatures = ['API', 'Dashboard', 'Exports', 'Team', 'SSO']
const sampleEntities = [
  { name: 'Us', coverage: { API: true, Dashboard: true, Exports: true, Team: true, SSO: 'partial' as const } },
  { name: 'Competitor A', coverage: { API: true, Dashboard: true, Exports: false, Team: true, SSO: true } },
  { name: 'Competitor B', coverage: { API: 'partial' as const, Dashboard: true, Exports: true, Team: false, SSO: false } },
]
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 py-8 space-y-6">
    <!-- Field Types -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-highlighted">
          All Field Types
        </h3>
      </template>
      <ClientOnly>
        <ProtoForm
          :fields="galleryFields"
          :model="galleryState"
          :cols="2"
        />
        <template #fallback>
          <div class="space-y-3 animate-pulse">
            <div
              v-for="i in 4"
              :key="i"
              class="h-10 bg-muted rounded"
            />
          </div>
        </template>
      </ClientOnly>
    </UCard>

    <!-- Stat Grid -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-highlighted">
          ProtoStatGrid
        </h3>
      </template>
      <div class="space-y-4">
        <ProtoStatGrid
          :stats="sampleStats"
          :cols="4"
        />
        <ProtoStatGrid
          :stats="sampleStats.slice(0, 2)"
          :cols="2"
          size="sm"
        />
      </div>
    </UCard>

    <!-- Badges -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-highlighted">
          ProtoBadge
        </h3>
      </template>
      <div class="flex flex-wrap gap-2">
        <ProtoBadge
          label="Success"
          color="success"
        />
        <ProtoBadge
          label="Warning"
          color="warning"
        />
        <ProtoBadge
          label="Error"
          color="error"
        />
        <ProtoBadge
          label="Info"
          color="info"
        />
        <ProtoBadge
          label="With Icon"
          icon="i-lucide-star"
        />
        <ProtoBadge
          label="Outline"
          variant="outline"
        />
      </div>
    </UCard>

    <!-- ProtoCard -->
    <div class="grid md:grid-cols-2 gap-4">
      <ProtoCard
        title="Growth Card"
        icon="i-lucide-trending-up"
        :badge="{ label: 'Healthy', color: 'success' }"
        :stats="[
          { label: 'MRR', value: '$12.5K', valueClass: 'text-primary' },
          { label: 'Growth', value: '+8%', valueClass: 'text-emerald-600' },
        ]"
      />
      <ProtoCard
        title="Status Card"
        icon="i-lucide-activity"
        description="With a description and footer."
        footer="Last updated 2 hours ago"
        :stats="[
          { label: 'Uptime', value: '99.9%' },
          { label: 'Latency', value: '45ms' },
        ]"
      />
    </div>

    <!-- Visualizations row 1 -->
    <div class="grid md:grid-cols-2 gap-4">
      <UCard>
        <template #header>
          <h3 class="font-semibold text-highlighted">
            VizBarChart
          </h3>
        </template>
        <VizBarChart
          :data="sampleBarData"
          unit=" leads"
        />
      </UCard>
      <UCard>
        <template #header>
          <h3 class="font-semibold text-highlighted">
            VizBenchmarkBar
          </h3>
        </template>
        <VizBenchmarkBar
          :value="7.2"
          :median="5"
          :min="0"
          :max="10"
          label="NPS Score"
          unit=""
        />
      </UCard>
    </div>

    <!-- Visualizations row 2 -->
    <div class="grid md:grid-cols-2 gap-4">
      <UCard>
        <template #header>
          <h3 class="font-semibold text-highlighted">
            VizTimeline
          </h3>
        </template>
        <VizTimeline :items="sampleTimeline" />
      </UCard>
      <UCard>
        <template #header>
          <h3 class="font-semibold text-highlighted">
            VizFeatureMatrix
          </h3>
        </template>
        <VizFeatureMatrix
          :features="sampleFeatures"
          :entities="sampleEntities"
        />
      </UCard>
    </div>

    <!-- VizProgressBar -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-highlighted">
          VizProgressBar
        </h3>
      </template>
      <div class="space-y-4">
        <VizProgressBar
          :value="75"
          label="Tasks Complete"
          :thresholds="[
            { value: 0, color: 'bg-red-500' },
            { value: 50, color: 'bg-amber-500' },
            { value: 80, color: 'bg-emerald-500' },
          ]"
        />
        <VizProgressBar
          :value="35"
          label="Budget Used"
        />
      </div>
    </UCard>
  </div>
</template>
