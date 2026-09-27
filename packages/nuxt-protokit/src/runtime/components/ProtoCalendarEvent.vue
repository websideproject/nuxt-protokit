<script setup>
import { computed } from 'vue'
import { getEventColorStyle, formatTimeRange, formatStartTime } from '../utils/calendarLayout'

const props = defineProps({
  event: { type: Object, required: true },
  view: { type: String, required: true },
})
defineEmits(['click'])
const colorStyle = computed(() => getEventColorStyle(props.event.color ?? 'blue'))
</script>

<template>
  <div
    class="rounded cursor-pointer select-none overflow-hidden transition-opacity hover:opacity-90 active:opacity-75"
    :style="{
      background: colorStyle.background,
      color: colorStyle.color,
      border: `1px solid ${colorStyle.borderSubtle}`,
      borderLeft: `3px solid ${colorStyle.borderColor}`,
      padding: view === 'day' ? '6px 8px' : '2px 6px',
    }"
    @click.stop="$emit('click')"
  >
    <!-- Month view: time prefix + title -->
    <template v-if="view === 'month'">
      <p class="text-xs font-medium truncate leading-tight">
        <span
          v-if="!event.allDay && event.startAt"
          class="opacity-75 mr-1"
        >{{ formatStartTime(event.startAt) }}</span>
        {{ event.title || "(No title)" }}
      </p>
    </template>

    <!-- Week view: title + time range -->
    <template v-else-if="view === 'week'">
      <p class="text-xs font-semibold truncate leading-tight">
        {{ event.title || "(No title)" }}
      </p>
      <p
        v-if="!event.allDay && event.startAt && event.endAt"
        class="text-xs opacity-75 truncate leading-tight"
      >
        {{ formatTimeRange(event.startAt, event.endAt) }}
      </p>
    </template>

    <!-- Day view: title + time + location + description -->
    <template v-else>
      <p class="text-sm font-semibold truncate leading-tight">
        {{ event.title || "(No title)" }}
      </p>
      <p
        v-if="!event.allDay && event.startAt && event.endAt"
        class="text-xs opacity-75 truncate"
      >
        {{ formatTimeRange(event.startAt, event.endAt) }}
      </p>
      <p
        v-if="event.location"
        class="text-xs opacity-75 truncate mt-0.5"
      >
        {{ event.location }}
      </p>
      <p
        v-if="event.description"
        class="text-xs opacity-60 truncate mt-0.5"
      >
        {{ event.description }}
      </p>
    </template>
  </div>
</template>
