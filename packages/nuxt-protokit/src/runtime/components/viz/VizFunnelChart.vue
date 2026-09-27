<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '../../utils/formatters'

interface FunnelStep {
  label: string
  value: number
  color?: string
}

const props = withDefaults(defineProps<{
  data: FunnelStep[]
  unit?: string
  showConversion?: boolean
}>(), {
  unit: '',
  showConversion: true,
})

const PALETTE = [
  'var(--color-primary-500, #3b82f6)',
  'var(--color-primary-400, #60a5fa)',
  'var(--color-primary-300, #93c5fd)',
  'var(--color-primary-200, #bfdbfe)',
  'var(--color-primary-100, #dbeafe)',
]

const max = computed(() => props.data[0]?.value || 1)

const steps = computed(() => props.data.map((d, i) => ({
  ...d,
  pct: Math.round((d.value / max.value) * 100),
  color: d.color || PALETTE[i % PALETTE.length],
  conversion: i > 0 && props.data[i - 1]
    ? Math.round((d.value / props.data[i - 1]!.value) * 100)
    : null,
})))
</script>

<template>
  <div class="w-full space-y-1.5">
    <div
      v-for="(step, i) in steps"
      :key="i"
      class="flex flex-col gap-0.5"
    >
      <!-- Conversion arrow between steps -->
      <div
        v-if="showConversion && step.conversion !== null"
        class="flex items-center gap-1 px-2 text-xs text-muted py-0.5"
      >
        <UIcon
          name="i-lucide-arrow-down"
          class="w-3 h-3"
        />
        <span>{{ step.conversion }}% conversion</span>
      </div>

      <!-- Bar row -->
      <div class="flex items-center gap-2">
        <div class="flex-1">
          <div class="flex justify-between items-baseline mb-1">
            <span class="text-sm text-muted truncate mr-2">{{ step.label }}</span>
            <span class="text-sm font-semibold text-highlighted shrink-0">
              {{ formatNumber(step.value) }}{{ unit }}
            </span>
          </div>
          <div
            class="h-8 rounded"
            style="background: color-mix(in srgb, currentColor 8%, transparent)"
          >
            <div
              class="h-full rounded transition-all duration-500 flex items-center px-2"
              :style="{ width: `${step.pct}%`, background: step.color }"
            >
              <span
                v-if="step.pct > 15"
                class="text-xs font-medium text-white/90 truncate"
              >
                {{ step.pct }}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
