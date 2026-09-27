<script setup lang="ts">
import { computed, useId } from 'vue'

interface Series {
  label: string
  data: Array<{ label: string, value: number }>
  color?: string
}

const props = withDefaults(defineProps<{
  series: Series[]
  showAxes?: boolean
  unit?: string
  emptyText?: string
  stacked?: boolean
}>(), {
  unit: '',
})

// Stable across server and client render: SVG gradient ids must match for hydration
const uid = useId()

const PALETTE = [
  'var(--color-primary-500, #3b82f6)',
  'var(--color-violet-500, #8b5cf6)',
  'var(--color-emerald-500, #10b981)',
  'var(--color-amber-500, #f59e0b)',
  'var(--color-rose-500, #f43f5e)',
]

const VW = 400
const VH = computed(() => props.showAxes ? 130 : 80)
// Global max (or stacked max): the top of the y axis
const maxValue = computed(() => {
  const n = props.series[0]?.data.length ?? 0
  let max = 0
  if (props.stacked) {
    for (let i = 0; i < n; i++) {
      const stackSum = props.series.reduce((s, ser) => s + (ser.data[i]?.value ?? 0), 0)
      max = Math.max(max, stackSum)
    }
  }
  else {
    for (const ser of props.series) {
      for (const d of ser.data) max = Math.max(max, d.value)
    }
  }
  return max
})

// The y-axis labels are right-aligned in the left padding: make it as wide as the longest one (~5.5 units per
// character at font-size 9), so a label like "22,935$" is not cut off.
const PAD = computed(() => props.showAxes
  ? { top: 12, right: 10, bottom: 28, left: Math.max(38, 8 + `${maxValue.value.toLocaleString()}${props.unit}`.length * 5.5) }
  : { top: 8, right: 8, bottom: 8, left: 8 },
)

const xLabels = computed(() => {
  const first = props.series[0]
  if (!first) return []
  return first.data.map(d => d.label)
})

const chart = computed(() => {
  if (!props.series.length || !props.series[0]?.data.length) return null
  const n = props.series[0].data.length
  if (n < 2) return null

  const { top, right, bottom, left } = PAD.value
  const iW = VW - left - right
  const iH = VH.value - top - bottom
  const baseY = top + iH

  const maxVal = maxValue.value
  if (maxVal === 0) return null

  const seriesPaths = props.series.map((ser, si) => {
    const color = ser.color || PALETTE[si % PALETTE.length]
    const gradId = `vac-${uid}-${si}`

    const pts = ser.data.map((d, i) => {
      const x = left + (i / (n - 1)) * iW
      const y = top + iH - (d.value / maxVal) * iH
      return { x, y, value: d.value, label: d.label }
    })

    const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    const areaD = `${lineD} L${pts.at(-1)!.x.toFixed(1)} ${baseY} L${pts[0].x.toFixed(1)} ${baseY} Z`

    return { pts, lineD, areaD, color, gradId, label: ser.label }
  })

  const maxLabels = 6
  const step = Math.max(1, Math.ceil((n - 1) / (maxLabels - 1)))
  const xTicks = Array.from({ length: n }, (_, i) => i)
    .filter(i => i === 0 || i === n - 1 || i % step === 0)
    .map(i => ({ x: left + (i / (n - 1)) * iW, label: xLabels.value[i] }))

  return { seriesPaths, maxVal, baseY, xTicks, left, top, iH, iW }
})
</script>

<template>
  <div class="w-full">
    <div
      v-if="!chart"
      class="flex items-center justify-center text-xs text-muted italic"
      :style="{ height: `${VH}px` }"
    >
      {{ emptyText || 'Not enough data' }}
    </div>

    <template v-else>
      <svg
        :viewBox="`0 0 ${VW} ${VH}`"
        class="w-full"
        style="display: block"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient
            v-for="sp in chart.seriesPaths"
            :id="sp.gradId"
            :key="sp.gradId"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              :stop-color="sp.color"
              stop-opacity="0.3"
            />
            <stop
              offset="100%"
              :stop-color="sp.color"
              stop-opacity="0.02"
            />
          </linearGradient>
        </defs>

        <!-- Axes -->
        <template v-if="showAxes && chart">
          <line
            :x1="chart.left"
            :y1="chart.top"
            :x2="chart.left"
            :y2="chart.baseY"
            stroke="currentColor"
            stroke-width="0.5"
            opacity="0.2"
          />
          <line
            :x1="chart.left"
            :y1="chart.baseY"
            :x2="VW - PAD.right"
            :y2="chart.baseY"
            stroke="currentColor"
            stroke-width="0.5"
            opacity="0.2"
          />
          <line
            :x1="chart.left"
            :y1="chart.top + chart.iH / 2"
            :x2="VW - PAD.right"
            :y2="chart.top + chart.iH / 2"
            stroke="currentColor"
            stroke-width="0.5"
            opacity="0.1"
            stroke-dasharray="4 4"
          />
          <text
            :x="chart.left - 4"
            :y="chart.top + 4"
            text-anchor="end"
            font-size="9"
            fill="currentColor"
            opacity="0.5"
          >
            {{ chart.maxVal.toLocaleString() }}{{ unit }}
          </text>
          <text
            :x="chart.left - 4"
            :y="chart.top + chart.iH / 2 + 3"
            text-anchor="end"
            font-size="9"
            fill="currentColor"
            opacity="0.35"
          >
            {{ Math.round(chart.maxVal / 2).toLocaleString() }}
          </text>
          <text
            :x="chart.left - 4"
            :y="chart.baseY"
            text-anchor="end"
            font-size="9"
            fill="currentColor"
            opacity="0.3"
          >
            0
          </text>
          <text
            v-for="xt in chart.xTicks"
            :key="xt.label"
            :x="xt.x"
            :y="VH - 4"
            text-anchor="middle"
            font-size="9"
            fill="currentColor"
            opacity="0.45"
          >
            {{ xt.label }}
          </text>
        </template>

        <!-- Series (rendered back to front) -->
        <template
          v-for="sp in chart.seriesPaths"
          :key="sp.label"
        >
          <path
            :d="sp.areaD"
            :fill="`url(#${sp.gradId})`"
          />
          <path
            :d="sp.lineD"
            fill="none"
            :stroke="sp.color"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle
            v-for="pt in sp.pts"
            :key="pt.label"
            :cx="pt.x"
            :cy="pt.y"
            r="3"
            :fill="sp.color"
            stroke="white"
            stroke-width="1.5"
          >
            <title>{{ pt.label }}: {{ pt.value.toLocaleString() }}{{ unit }}</title>
          </circle>
        </template>
      </svg>

      <!-- Legend -->
      <div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 justify-center">
        <div
          v-for="sp in chart.seriesPaths"
          :key="sp.label"
          class="flex items-center gap-1.5 text-xs text-muted"
        >
          <span
            class="inline-block w-6 h-0.5 rounded"
            :style="{ background: sp.color }"
          />
          {{ sp.label }}
        </div>
      </div>
    </template>
  </div>
</template>
