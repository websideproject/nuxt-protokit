<script setup lang="ts">
import { computed, ref } from 'vue'

// ── Sample data ───────────────────────────────────────────────────────────────

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const revenueData = months.map((label, i) => ({
  label,
  value: 12000 + Math.round(Math.sin(i * 0.6) * 4000 + i * 800 + Math.random() * 1500),
}))

const usersData = months.map((label, i) => ({
  label,
  value: 800 + Math.round(i * 120 + Math.sin(i * 0.8) * 200 + Math.random() * 100),
}))

const revenueAreaSeries = [
  {
    label: 'Revenue',
    data: revenueData,
    color: 'var(--color-primary-500, #3b82f6)',
  },
  {
    label: 'Target',
    data: months.map((label, i) => ({ label, value: 14000 + i * 600 })),
    color: 'var(--color-emerald-500, #10b981)',
  },
]

const channelData = [
  { label: 'Organic Search', value: 42, color: 'var(--color-primary-500)' },
  { label: 'Direct', value: 24, color: 'var(--color-emerald-500)' },
  { label: 'Social', value: 18, color: 'var(--color-violet-500)' },
  { label: 'Email', value: 11, color: 'var(--color-amber-500)' },
  { label: 'Referral', value: 5, color: 'var(--color-rose-500)' },
]

const barData = [
  { label: 'Product A', value: 45200, color: 'bg-primary' },
  { label: 'Product B', value: 38100 },
  { label: 'Product C', value: 29700 },
  { label: 'Product D', value: 22500 },
  { label: 'Product E', value: 14300 },
]

const funnelData = [
  { label: 'Website Visitors', value: 24800 },
  { label: 'Sign-ups', value: 7200 },
  { label: 'Free Trial', value: 3100 },
  { label: 'Paid Conversion', value: 840 },
  { label: 'Retained (6mo)', value: 512 },
]

const statCards = [
  {
    label: 'Monthly Revenue',
    value: '$48,291',
    subLabel: 'vs $41,200 last month',
    trend: 17.2,
    trendLabel: 'vs last month',
    icon: 'i-lucide-dollar-sign',
    color: 'emerald' as const,
    sparkline: revenueData.slice(-8).map(d => d.value),
  },
  {
    label: 'Active Users',
    value: '2,847',
    subLabel: 'Daily active users',
    trend: 8.1,
    trendLabel: 'vs last week',
    icon: 'i-lucide-users',
    color: 'primary' as const,
    sparkline: usersData.slice(-8).map(d => d.value),
  },
  {
    label: 'Conversion Rate',
    value: '3.4%',
    subLabel: 'Visitor to paid',
    trend: -0.6,
    trendLabel: 'vs last month',
    icon: 'i-lucide-percent',
    color: 'amber' as const,
    sparkline: [2.8, 3.1, 3.5, 3.2, 3.8, 3.6, 3.4, 3.4],
  },
  {
    label: 'Churn Rate',
    value: '1.2%',
    subLabel: 'Monthly churn',
    trend: -0.3,
    trendLabel: 'vs last month (lower is better)',
    icon: 'i-lucide-log-out',
    color: 'rose' as const,
    sparkline: [2.1, 1.9, 1.7, 1.5, 1.4, 1.3, 1.2, 1.2],
  },
  {
    label: 'Avg. Session',
    value: '4m 38s',
    subLabel: 'Time on site',
    trend: 12,
    trendLabel: 'vs last week',
    icon: 'i-lucide-clock',
    color: 'violet' as const,
    sparkline: [210, 195, 220, 240, 255, 268, 272, 278],
  },
  {
    label: 'NPS Score',
    value: 72,
    subLabel: 'Net Promoter Score',
    trend: 4,
    trendLabel: 'vs last quarter',
    icon: 'i-lucide-star',
    color: 'sky' as const,
    sparkline: [55, 58, 62, 60, 65, 68, 70, 72],
  },
]

const lineTab = ref<'line' | 'area'>('line')
const pieTab = ref<'pie' | 'donut'>('pie')
</script>

<template>
  <div class="min-h-screen bg-muted/20 p-6 space-y-8">
    <div>
      <h1 class="text-2xl font-bold text-highlighted">
        Charts & Analytics
      </h1>
      <p class="text-sm text-muted mt-1">
        All chart types available in ProtoKit viz system
      </p>
    </div>

    <!-- ── KPI Stat Cards ──────────────────────────────────────────────────── -->
    <section>
      <h2 class="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
        Analytics Overview
      </h2>
      <VizStatCards :cards="statCards" :cols="3" />
    </section>

    <!-- ── Line + Area Charts ─────────────────────────────────────────────── -->
    <section>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wide">
          Revenue Trend
        </h2>
        <div class="flex gap-1">
          <UButton
            v-for="tab in ['line', 'area'] as const"
            :key="tab"
            size="xs"
            :variant="lineTab === tab ? 'solid' : 'ghost'"
            :color="lineTab === tab ? 'primary' : 'neutral'"
            class="capitalize"
            @click="lineTab = tab"
          >
            {{ tab }}
          </UButton>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-lg border border-default bg-default p-4">
          <h3 class="text-sm font-medium text-highlighted mb-3">
            {{ lineTab === 'line' ? 'Line Chart' : 'Area Chart' }} — Monthly Revenue
          </h3>
          <VizLineChart
            v-if="lineTab === 'line'"
            :data="revenueData"
            show-axes
            unit="$"
            color="var(--color-primary-500)"
          />
          <VizAreaChart
            v-else
            :series="revenueAreaSeries"
            show-axes
            unit="$"
          />
        </div>

        <div class="rounded-lg border border-default bg-default p-4">
          <h3 class="text-sm font-medium text-highlighted mb-3">
            Line Chart — Active Users
          </h3>
          <VizLineChart
            :data="usersData"
            show-axes
            color="var(--color-emerald-500)"
          />
        </div>
      </div>
    </section>

    <!-- ── Bar + Pie/Donut ────────────────────────────────────────────────── -->
    <section>
      <h2 class="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
        Distribution
      </h2>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="rounded-lg border border-default bg-default p-4">
          <h3 class="text-sm font-medium text-highlighted mb-3">
            Bar Chart — Revenue by Product
          </h3>
          <VizBarChart :data="barData" unit="$" />
        </div>

        <div class="rounded-lg border border-default bg-default p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-highlighted">
              {{ pieTab === 'pie' ? 'Pie' : 'Donut' }} Chart — Traffic Sources
            </h3>
            <div class="flex gap-1">
              <UButton
                v-for="tab in ['pie', 'donut'] as const"
                :key="tab"
                size="xs"
                :variant="pieTab === tab ? 'solid' : 'ghost'"
                :color="pieTab === tab ? 'primary' : 'neutral'"
                class="capitalize"
                @click="pieTab = tab"
              >
                {{ tab }}
              </UButton>
            </div>
          </div>
          <VizPieChart
            :data="channelData"
            :donut="pieTab === 'donut'"
            unit="%"
          />
        </div>

        <div class="rounded-lg border border-default bg-default p-4">
          <h3 class="text-sm font-medium text-highlighted mb-3">
            Progress — Goal Completion
          </h3>
          <div class="space-y-4">
            <div>
              <p class="text-xs text-muted mb-1">
                Revenue Goal
              </p>
              <VizProgressBar :value="82" :max="100" />
              <p class="text-xs text-muted mt-1">
                $48,291 / $58,800
              </p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1">
                User Growth
              </p>
              <VizProgressBar :value="67" :max="100" :thresholds="[{ value: 80, color: 'bg-emerald-500', label: 'Target' }]" />
              <p class="text-xs text-muted mt-1">
                2,847 / 4,250
              </p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1">
                Trial Conversions
              </p>
              <VizProgressBar :value="45" :max="100" :thresholds="[{ value: 60, color: 'bg-amber-500' }]" />
              <p class="text-xs text-muted mt-1">
                840 / 1,870
              </p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1">
                NPS Target
              </p>
              <VizProgressBar :value="72" :max="100" />
              <p class="text-xs text-muted mt-1">
                72 / 100
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Funnel Chart ───────────────────────────────────────────────────── -->
    <section>
      <h2 class="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
        Conversion Funnel
      </h2>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-lg border border-default bg-default p-4">
          <h3 class="text-sm font-medium text-highlighted mb-4">
            Funnel Chart — Acquisition to Retention
          </h3>
          <VizFunnelChart :data="funnelData" show-conversion />
        </div>

        <div class="rounded-lg border border-default bg-default p-4">
          <h3 class="text-sm font-medium text-highlighted mb-3">
            Benchmark — Monthly Recurring Revenue
          </h3>
          <VizBenchmarkBar
            :value="48291"
            :median="35000"
            :min="5000"
            :max="120000"
            label="Your MRR"
            unit="$"
          />

          <div class="mt-6">
            <h3 class="text-sm font-medium text-highlighted mb-3">
              Timeline — Q4 Milestones
            </h3>
            <VizTimeline
              :items="[
                { title: 'Q4 Kickoff', date: 'Oct 1', status: 'done', description: 'Quarterly planning session complete' },
                { title: 'Feature Launch', date: 'Oct 28', status: 'done', description: 'Charts & Analytics v2' },
                { title: 'Pricing Update', date: 'Nov 15', status: 'current', description: 'New tier rollout in progress' },
                { title: 'End of Year Review', date: 'Dec 20', status: 'upcoming', description: 'Annual metrics review' },
              ]"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ── Inline Sparklines ──────────────────────────────────────────────── -->
    <section>
      <h2 class="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
        Compact / Sparklines
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="card in statCards.slice(0, 4)"
          :key="card.label"
          class="rounded-lg border border-default bg-default p-3"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-muted">{{ card.label }}</span>
            <UIcon v-if="card.icon" :name="card.icon" class="w-3.5 h-3.5 text-muted" />
          </div>
          <p class="text-xl font-bold text-highlighted">
            {{ card.value }}
          </p>
          <VizLineChart
            v-if="card.sparkline"
            :data="card.sparkline.map((v, i) => ({ label: String(i), value: v }))"
            :color="card.color === 'emerald' ? 'var(--color-emerald-500)' : card.color === 'rose' ? 'var(--color-rose-500)' : 'var(--color-primary-500)'"
          />
        </div>
      </div>
    </section>
  </div>
</template>
