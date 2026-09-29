<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarEvent } from '../../calendar/types'
import { useCalendarContext } from '../../calendar/context'
import { calendarColorStyle, calendarDotClass, eventBlockClass, eventChipCompactClass, eventOutlineClass } from '../../calendar/colors'
import EventPopover from './ProtoCalendarEventPopover.vue'

defineOptions({ inheritAttrs: false })

// `anchored` is the segment the form hangs off, for an event drawn across more than one day.
// Defaulted, or an omitted boolean prop would read as `false`
const props = withDefaults(defineProps<{
  event: CalendarEvent
  showTime?: boolean
  anchored?: boolean
}>(), { anchored: true })

const { colorOf, format, movingId, moveSuppressed, onChipPointerdown, clickEvent } = useCalendarContext()

const colorStyle = computed(() => calendarColorStyle(colorOf(props.event)))

// Held open or in flight, the chip wears the shade the pointer gives it
const moving = computed(() => movingId.value === props.event.id)

function onClick() {
  if (!moveSuppressed.value) {
    clickEvent(props.event)
  }
}
</script>

<template>
  <EventPopover
    v-slot="{ open }"
    :event="event"
    :disabled="moveSuppressed"
    :anchored="anchored"
  >
    <button
      v-bind="$attrs"
      type="button"
      data-event
      class="select-none flex items-center gap-1.5 min-w-0 rounded-full px-1.5 py-0.5 text-xs text-start transition-colors focus-visible:outline-3"
      :class="[
        eventOutlineClass,
        event.allDay
          ? eventBlockClass
          : ['text-default hover:bg-elevated data-active:bg-elevated', eventChipCompactClass],
      ]"
      :style="colorStyle"
      :data-active="open || moving || undefined"
      :aria-label="event.allDay ? event.title : `${event.title}, ${format.time(new Date(event.start))}`"
      @click.stop="onClick"
      @pointerdown="onChipPointerdown($event, event)"
    >
      <span
        v-if="event.allDay"
        :class="calendarDotClass"
        class="rounded-full flex items-center justify-center p-0.5 -mx-0.75"
      >
        <UIcon
          name="i-lucide-calendar"
          class="size-2.5 shrink-0 text-inverted"
        />
      </span>
      <span
        v-else
        class="max-lg:hidden size-2 shrink-0 rounded-full"
        :class="calendarDotClass"
      />

      <span class="font-medium truncate">{{ event.title }}</span>
      <!-- `data-time` so a call site in a tight spot can hide it from outside -->
      <span
        v-if="showTime && !event.allDay"
        data-time
        class="ms-auto shrink-0 text-muted tabular-nums text-[11px]"
      >
        {{ format.time(new Date(event.start)) }}
      </span>
    </button>
  </EventPopover>
</template>
