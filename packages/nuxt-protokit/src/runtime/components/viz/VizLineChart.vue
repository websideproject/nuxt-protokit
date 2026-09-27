<script setup lang="ts">
import { computed, useId } from 'vue'
import { formatNumber } from '../../utils/formatters'

const props = withDefaults(defineProps<{
  data: Array<{ label: string, value: number }>
  color?: string
  showAxes?: boolean
  emptyText?: string
  unit?: string
}>(), {
  unit: '',
})

// Stable across server and client render: SVG gradient ids must match for hydration
const uid = useId()
const gradientId = `vlc-${uid}`

const VW = 400
const VH = computed(() => props.showAxes ? 120 : 56)
// The y-axis labels are right-aligned in the left padding: make it as wide as the longest one (~5.5 units per
// character at font-size 9), so a label like "22,935$" is not cut off.
const axisLabelWidth = computed(() => {
  const max = Math.max(0, ...props.data.map(d => d.value))
  return 8 + `${formatNumber(max)}${props.unit ?? ''}`.length * 5.5
})
const PAD = computed(() => props.showAxes
  ? { top: 12, right: 10, bottom: 26, left: Math.max(36, axisLabelWidth.value) }
  : { top: 6, right: 6, bottom: 6, left: 6 },
)

const strokeColor = computed(() => props.color || 'var(--color-primary-500, #3b82f6)')

const chart = computed(() => {
  const raw = props.data
  if (raw.length < 2) return null
  const max = Math.max(...raw.map(d => d.value))
  if (max === 0) return null

  const { top, right, bottom, left } = PAD.value
  const iW = VW - left - right
  const iH = VH.value - top - bottom

  const pts = raw.map((d, i) => ({
    x: left + (i / (raw.length - 1)) * iW,
    y: top + iH - (d.value / max) * iH,
    value: d.value,
    label: d.label,
  }))

  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const baseY = top + iH
  const areaD = `${lineD} L${pts.at(-1)!.x.toFixed(1)} ${baseY} L${pts[0].x.toFixed(1)} ${baseY} Z`

  const maxLabels = 5
  const step = Math.max(1, Math.ceil((raw.length - 1) / (maxLabels - 1)))
  const xLabels = pts
    .filter((_, i) => i === 0 || i === raw.length - 1 || i % step === 0)
    .map(p => ({ x: p.x, label: p.label }))

  return { pts, lineD, areaD, max, baseY, xLabels, left, top, iH, iW }
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

    <svg
      v-else
      :viewBox="`0 0 ${VW} ${VH}`"
      class="w-full"
      style="display: block"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient
          :id="gradientId"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            :stop-color="strokeColor"
            stop-opacity="0.25"
          />
          <stop
            offset="100%"
            :stop-color="strokeColor"
            stop-opacity="0.01"
          />
        </linearGradient>
      </defs>

      <template v-if="showAxes && chart">
        <line
          :x1="chart.left"
          :y1="chart.top"
          :x2="chart.left"
          :y2="chart.baseY"
          stroke="currentColor"
          stroke-width="0.5"
          class="text-default"
          opacity="0.2"
        />
        <line
          :x1="chart.left"
          :y1="chart.baseY"
          :x2="VW - PAD.right"
          :y2="chart.baseY"
          stroke="currentColor"
          stroke-width="0.5"
          class="text-default"
          opacity="0.2"
        />
        <line
          :x1="chart.left"
          :y1="chart.top + chart.iH / 2"
          :x2="VW - PAD.right"
          :y2="chart.top + chart.iH / 2"
          stroke="currentColor"
          stroke-width="0.5"
          class="text-default"
          opacity="0.1"
          stroke-dasharray="4 4"
        />
        <text
          :x="chart.left - 4"
          :y="chart.top + 4"
          text-anchor="end"
          font-size="9"
          fill="currentColor"
          class="text-muted"
          opacity="0.55"
        >
          {{ formatNumber(chart.max) }}{{ unit }}
        </text>
        <text
          :x="chart.left - 4"
          :y="chart.top + chart.iH / 2 + 3"
          text-anchor="end"
          font-size="9"
          fill="currentColor"
          class="text-muted"
          opacity="0.4"
        >
          {{ formatNumber(Math.round(chart.max / 2)) }}
        </text>
        <text
          :x="chart.left - 4"
          :y="chart.baseY"
          text-anchor="end"
          font-size="9"
          fill="currentColor"
          class="text-muted"
          opacity="0.35"
        >
          0
        </text>
        <text
          v-for="xl in chart.xLabels"
          :key="xl.label"
          :x="xl.x"
          :y="VH - 4"
          text-anchor="middle"
          font-size="9"
          fill="currentColor"
          class="text-muted"
          opacity="0.5"
        >
          {{ xl.label }}
        </text>
      </template>

      <path
        :d="chart.areaD"
        :fill="`url(#${gradientId})`"
      />
      <path
        :d="chart.lineD"
        fill="none"
        :stroke="strokeColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <circle
        v-for="pt in chart.pts"
        :key="pt.label"
        :cx="pt.x"
        :cy="pt.y"
        r="3.5"
        :fill="strokeColor"
        stroke="white"
        stroke-width="1.5"
      >
        <title>{{ pt.label }}: {{ formatNumber(pt.value) }}{{ unit }}</title>
      </circle>
    </svg>
  </div>
</template>
