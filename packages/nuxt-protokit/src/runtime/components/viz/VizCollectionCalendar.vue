<script setup lang="ts">
// A collection drawn on <ProtoCalendarView>: each item with a date becomes an event, and dragging one
// writes the new date (and times, for a timed item) back through `onUpdate`. Items are edited through
// the collection's own UI, so the calendar neither creates events nor opens its inline form; a click
// emits `event-click` with the item id.
import { computed, ref } from 'vue'
import { addDays, addMinutes } from 'date-fns'
import type { CalendarEvent, CalendarView } from '../../calendar/types'
import type { CollectionCalendarConfig } from '../../types/brick'
import { toLocalISO } from '../../calendar/dates'
import ProtoCalendarView from '../calendar/ProtoCalendarView.vue'

type Item = Record<string, any>

const props = defineProps<{
  items: Item[]
  config: CollectionCalendarConfig
  onUpdate?: (index: number, value: Item) => void
}>()

const emit = defineEmits<{
  'event-click': [id: string]
}>()

const view = ref<CalendarView>('month')

const idField = computed(() => props.config.idField ?? '_id')

function isAllDay(item: Item): boolean {
  return props.config.allDayField ? item[props.config.allDayField] !== false : true
}

function nextDay(ymd: string): string {
  return toLocalISO(addDays(new Date(`${ymd}T00:00:00`), 1)).slice(0, 10)
}

// Dates are `YYYY-MM-DD` and times `HH:mm` on the item. The view's ranges are [start, end): an all-day
// item ends at 00:00 the day after its last day, and a timed one with no end time runs an hour
function itemToEvent(item: Item): CalendarEvent | null {
  const { config } = props
  const date: string | undefined = item[config.dateField] || (config.endDateField && item[config.endDateField])
  if (!date) {
    return null
  }

  const endDate: string = (config.endDateField && item[config.endDateField]) || date
  const status = item.status
  const color = (status && config.statusColorMap?.[status]) || config.defaultColor || 'neutral'
  const base = { id: String(item[idField.value]), title: item[config.titleField] || 'Untitled', color }

  if (isAllDay(item) || !config.timeField || !item[config.timeField]) {
    return { ...base, start: `${date}T00:00:00`, end: `${nextDay(endDate)}T00:00:00`, allDay: true }
  }

  const start = `${date}T${item[config.timeField]}:00`
  const end = config.endTimeField && item[config.endTimeField]
    ? `${endDate}T${item[config.endTimeField]}:00`
    : toLocalISO(addMinutes(new Date(start), 60))

  return { ...base, start, end: end > start ? end : toLocalISO(addMinutes(new Date(start), 60)) }
}

const events = computed(() => props.items.flatMap((item) => {
  const event = itemToEvent(item)
  return event ? [event] : []
}))

function onEventClick(event: CalendarEvent) {
  emit('event-click', event.id)
}

function onEventUpdate(event: CalendarEvent) {
  const { config } = props
  const index = props.items.findIndex(item => String(item[idField.value]) === event.id)
  if (index === -1) {
    return
  }

  const item = props.items[index]!
  const patch: Item = { [config.dateField]: event.start.slice(0, 10) }

  if (config.endDateField && item[config.endDateField]) {
    // An all-day item's last day sits a day before the exclusive end
    patch[config.endDateField] = event.allDay
      ? toLocalISO(addDays(new Date(event.end), -1)).slice(0, 10)
      : event.end.slice(0, 10)
  }

  if (!event.allDay && config.timeField) {
    patch[config.timeField] = event.start.slice(11, 16)
    if (config.endTimeField) {
      patch[config.endTimeField] = event.end.slice(11, 16)
    }
  }

  props.onUpdate?.(index, { ...item, ...patch })
}

const undatedItems = computed(() => props.items.filter(item => !item[props.config.dateField]))
</script>

<template>
  <div
    class="flex flex-col gap-4"
    style="height: calc(100vh - 280px); min-height: 480px;"
  >
    <div class="flex-1 min-h-0 overflow-hidden border border-default rounded-lg">
      <ProtoCalendarView
        v-model:view="view"
        :events="events"
        :views="['month', 'week']"
        :editable="!!onUpdate"
        :creatable="false"
        :popover="false"
        @event-click="onEventClick"
        @update="onEventUpdate"
      />
    </div>

    <div
      v-if="undatedItems.length"
      class="shrink-0"
    >
      <p class="text-sm font-medium text-muted mb-2 flex items-center gap-1">
        <UIcon
          name="i-lucide-calendar-x"
          class="w-4 h-4"
        />
        Without a date ({{ undatedItems.length }})
      </p>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <button
          v-for="item in undatedItems"
          :key="item[idField]"
          class="text-left p-2 border border-default rounded-lg hover:bg-elevated transition-colors"
          @click="emit('event-click', String(item[idField]))"
        >
          <p class="text-sm font-medium text-highlighted truncate">
            {{ item[config.titleField] || "Untitled" }}
          </p>
          <UBadge
            v-if="item.status"
            :color="(config.statusColorMap?.[item.status] as any) ?? 'neutral'"
            variant="soft"
            size="sm"
            class="mt-1"
          >
            {{ item.status }}
          </UBadge>
        </button>
      </div>
    </div>

    <div
      v-if="items.length === 0"
      class="text-center py-10 text-muted"
    >
      <UIcon
        name="i-lucide-calendar"
        class="h-10 w-10 mx-auto mb-3 opacity-30"
      />
      <p class="text-sm">
        No items yet.
      </p>
    </div>
  </div>
</template>
