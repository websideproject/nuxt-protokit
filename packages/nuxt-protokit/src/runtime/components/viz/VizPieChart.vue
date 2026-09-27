<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '../../utils/formatters'

interface Slice {
  label: string
  value: number
  color?: string
}

const props = withDefaults(defineProps<{
  data: Slice[]
  donut?: boolean
  unit?: string
  emptyText?: string
  showLegend?: boolean
}>(), {
  donut: false,
  unit: '',
  showLegend: true,
})

const PALETTE = [
  'var(--color-primary-500, #3b82f6)',
  'var(--color-violet-500, #8b5cf6)',
  'var(--color-emerald-500, #10b981)',
  'var(--color-amber-500, #f59e0b)',
  'var(--color-rose-500, #f43f5e)',
  'var(--color-sky-500, #0ea5e9)',
  'var(--color-teal-500, #14b8a6)',
  'var(--color-orange-500, #f97316)',
]

const CX = 100
const CY = 100
const R = 80
const INNER_R = props.donut ? 50 : 0

const total = computed(() => props.data.reduce((s, d) => s + d.value, 0))

const slices = computed(() => {
  if (total.value === 0) return []
  let angle = -Math.PI / 2 // start at top
  return props.data.map((d, i) => {
    const sweep = (d.value / total.value) * 2 * Math.PI
    const startAngle = angle
    angle += sweep
    const endAngle = angle

    const cos1 = Math.cos(startAngle)
    const sin1 = Math.sin(startAngle)
    const cos2 = Math.cos(endAngle)
    const sin2 = Math.sin(endAngle)

    const x1 = CX + R * cos1
    const y1 = CY + R * sin1
    const x2 = CX + R * cos2
    const y2 = CY + R * sin2

    const largeArc = sweep > Math.PI ? 1 : 0

    let pathD: string
    if (INNER_R > 0) {
      const ix1 = CX + INNER_R * cos1
      const iy1 = CY + INNER_R * sin1
      const ix2 = CX + INNER_R * cos2
      const iy2 = CY + INNER_R * sin2
      pathD = `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${ix2.toFixed(2)} ${iy2.toFixed(2)} A${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`
    }
    else {
      pathD = `M${CX} ${CY} L${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
    }

    const midAngle = startAngle + sweep / 2
    return {
      d: pathD,
      color: d.color || PALETTE[i % PALETTE.length],
      label: d.label,
      value: d.value,
      pct: Math.round((d.value / total.value) * 100),
      midAngle,
    }
  })
})
</script>

<template>
  <div class="w-full">
    <div
      v-if="total === 0"
      class="flex items-center justify-center text-xs text-muted italic h-24"
    >
      {{ emptyText || 'No data' }}
    </div>
    <template v-else>
      <svg
        viewBox="0 0 200 200"
        class="w-full max-w-[180px] mx-auto block"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          v-for="(slice, i) in slices"
          :key="i"
          :d="slice.d"
          :fill="slice.color"
          opacity="0.9"
          class="transition-opacity hover:opacity-100"
          style="cursor: default"
        >
          <title>{{ slice.label }}: {{ formatNumber(slice.value) }}{{ unit }} ({{ slice.pct }}%)</title>
        </path>
        <text
          v-if="donut"
          :x="CX"
          :y="CY + 5"
          text-anchor="middle"
          font-size="18"
          font-weight="600"
          fill="currentColor"
          class="text-highlighted"
        >
          {{ formatNumber(total) }}
        </text>
      </svg>

      <div
        v-if="showLegend"
        class="mt-2 flex flex-wrap gap-x-3 gap-y-1 justify-center"
      >
        <div
          v-for="(slice, i) in slices"
          :key="i"
          class="flex items-center gap-1 text-xs text-muted"
        >
          <span
            class="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
            :style="{ background: slice.color }"
          />
          <span>{{ slice.label }}</span>
          <span class="text-muted/60">({{ slice.pct }}%)</span>
        </div>
      </div>
    </template>
  </div>
</template>
