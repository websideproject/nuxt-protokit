<script setup>
import { computed } from 'vue'

const props = defineProps({
  cards: { type: Array, required: true },
  cols: { type: Number, required: false, default: 3 },
})
const gridClass = computed(() => ({
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
})[props.cols])
const colorMap = {
  primary: { bg: 'bg-primary/10', text: 'text-primary', icon: 'text-primary' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', icon: 'text-rose-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: 'text-amber-500' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', icon: 'text-violet-500' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', icon: 'text-sky-500' },
  neutral: { bg: 'bg-muted', text: 'text-default', icon: 'text-muted' },
}
function getColor(card) {
  return colorMap[card.color ?? 'neutral'] ?? colorMap.neutral
}
function trendIcon(trend) {
  if (trend > 0) return 'i-lucide-trending-up'
  if (trend < 0) return 'i-lucide-trending-down'
  return 'i-lucide-minus'
}
function trendClass(trend) {
  if (trend > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (trend < 0) return 'text-rose-600 dark:text-rose-400'
  return 'text-muted'
}
function buildSparkline(data) {
  if (data.length < 2) return ''
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const W = 80
  const H = 24
  const pts = data.map((v, i) => ({
    x: i / (data.length - 1) * W,
    y: H - (v - min) / range * (H - 4) - 2,
  }))
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}
</script>

<template>
  <div :class="['grid gap-3', gridClass]">
    <div
      v-for="(card, i) in cards"
      :key="i"
      class="rounded-lg border border-default bg-default p-4 flex flex-col gap-3"
    >
      <!-- Top row: icon + label -->
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-medium text-muted uppercase tracking-wide">
            {{ card.label }}
          </p>
        </div>
        <div
          v-if="card.icon"
          class="rounded-md p-1.5"
          :class="getColor(card).bg"
        >
          <UIcon
            :name="card.icon"
            class="w-4 h-4"
            :class="getColor(card).icon"
          />
        </div>
      </div>

      <!-- Value row -->
      <div class="flex items-end justify-between gap-2">
        <div>
          <p class="text-2xl font-bold text-highlighted leading-none">
            {{ card.value }}<span
              v-if="card.unit"
              class="text-sm font-normal text-muted ml-0.5"
            >{{ card.unit }}</span>
          </p>
          <p
            v-if="card.subLabel"
            class="text-xs text-muted mt-1"
          >
            {{ card.subLabel }}
          </p>
        </div>

        <!-- Sparkline -->
        <svg
          v-if="card.sparkline && card.sparkline.length >= 2"
          viewBox="0 0 80 24"
          class="shrink-0"
          style="width: 64px; height: 20px; overflow: visible"
        >
          <path
            :d="buildSparkline(card.sparkline)"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            :class="getColor(card).icon"
          />
        </svg>
      </div>

      <!-- Trend row -->
      <div
        v-if="card.trend !== void 0"
        class="flex items-center gap-1"
      >
        <UIcon
          :name="trendIcon(card.trend)"
          class="w-3.5 h-3.5"
          :class="trendClass(card.trend)"
        />
        <span
          class="text-xs font-medium"
          :class="trendClass(card.trend)"
        >
          {{ card.trend > 0 ? "+" : "" }}{{ card.trend }}%
        </span>
        <span
          v-if="card.trendLabel"
          class="text-xs text-muted"
        >
          {{ card.trendLabel }}
        </span>
      </div>
    </div>
  </div>
</template>
