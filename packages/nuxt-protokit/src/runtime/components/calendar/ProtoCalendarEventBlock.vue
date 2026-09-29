<script setup lang="ts">
import { computed } from 'vue'
import { addMinutes } from 'date-fns'
import type { PositionedEvent } from '../../calendar/layout'
import { MIN_EVENT_MINUTES, PX_PER_MINUTE, SNAP_MINUTES, eventBlockStyle } from '../../calendar/layout'
import { useCalendarContext } from '../../calendar/context'
import { calendarColorStyle, calendarDotClass, eventBlockClass, eventOutlineClass } from '../../calendar/colors'
import { toLocalISO } from '../../calendar/dates'
import { useEventDrag } from '../../calendar/useEventDrag'
import EventPopover from './ProtoCalendarEventPopover.vue'

// `anchored` is the segment the form hangs off, for a block running past midnight and drawn in both
// days. Defaulted, or an omitted boolean prop would read as `false`
const props = withDefaults(defineProps<{
  positioned: PositionedEvent
  anchored?: boolean
}>(), { anchored: true })

const { colorOf, canEdit, format, updateEvent, clickEvent } = useCalendarContext()

const event = computed(() => props.positioned.event)
const editable = computed(() => canEdit(event.value))

const {
  dragging,
  suppressed,
  mode,
  deltaMinutes,
  deltaX,
  onPointerdown,
  onPointermove,
  onPointerup,
  onPointercancel,
} = useEventDrag(event, {
  enabled: () => editable.value,
  onCommit(start, end) {
    updateEvent({ ...event.value, start: toLocalISO(start), end: toLocalISO(end) })
  },
})

const style = computed(() => {
  const height = dragging.value && mode.value === 'resize'
    ? Math.max(props.positioned.height + deltaMinutes.value * PX_PER_MINUTE, MIN_EVENT_MINUTES * PX_PER_MINUTE)
    : props.positioned.height

  return {
    ...calendarColorStyle(colorOf(event.value)),
    ...eventBlockStyle(props.positioned, height),
    transform: dragging.value && mode.value === 'move'
      ? `translate(${deltaX.value}px, ${deltaMinutes.value * PX_PER_MINUTE}px)`
      : undefined,
  }
})

// While dragging, show the previewed times instead of the stored ones
const previewTimes = computed(() => {
  const shift = dragging.value && mode.value === 'move' ? deltaMinutes.value : 0
  const start = addMinutes(new Date(event.value.start), shift)
  const end = addMinutes(new Date(event.value.end), dragging.value ? (mode.value === 'resize' ? deltaMinutes.value : shift) : 0)

  return `${format.value.time(start)} – ${format.value.time(end > start ? end : addMinutes(start, SNAP_MINUTES))}`
})

const compact = computed(() => props.positioned.height < 40)

function onClick() {
  if (!suppressed.value) {
    clickEvent(event.value)
  }
}
</script>

<template>
  <EventPopover
    :event="event"
    :disabled="suppressed"
    :anchored="anchored"
  >
    <button
      type="button"
      data-event
      class="absolute flex flex-col items-start overflow-hidden rounded-xs px-3 py-1 text-xs text-start transition-colors select-none focus-visible:outline-3"
      :class="[
        eventBlockClass,
        eventOutlineClass,
        editable && 'touch-none',
        dragging ? 'z-20' : 'z-5',
      ]"
      :style="style"
      :aria-label="`${event.title}, ${previewTimes}`"
      @click.stop="onClick"
      @pointerdown="onPointerdown"
      @pointermove="onPointermove"
      @pointerup="onPointerup"
      @pointercancel="onPointercancel"
    >
      <span
        class="absolute inset-s-1 inset-y-1 w-1 rounded-full"
        :class="calendarDotClass"
      />

      <span class="w-full font-medium truncate">{{ event.title }}</span>
      <span
        v-if="!compact || dragging"
        class="w-full truncate opacity-80 tabular-nums"
      >
        {{ previewTimes }}
      </span>

      <span
        v-if="editable"
        data-resize-handle
        class="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
      />
    </button>
  </EventPopover>
</template>
