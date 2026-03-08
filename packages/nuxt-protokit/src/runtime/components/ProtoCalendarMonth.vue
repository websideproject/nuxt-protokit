<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CalendarEvent } from '../types/calendar'
import {
  buildMonthWeeks,
  dateKey,
  isSameDay,
  isToday,
  toLocalISOString,
} from '../utils/calendarLayout'

const props = defineProps<{
  events: CalendarEvent[]
  currentDate: Date
}>()

const emit = defineEmits<{
  dayClick: [date: Date]
  eventClick: [event: CalendarEvent]
  eventMove: [id: string, newStartAt: string, newEndAt: string]
}>()

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_VISIBLE = 3

const weeks = computed(() =>
  buildMonthWeeks(props.currentDate.getFullYear(), props.currentDate.getMonth()),
)

// Build a map of dateKey → events (multi-day events appear in every spanned day)
const eventsByDay = computed(() => {
  const map = new Map<string, CalendarEvent[]>()
  for (const event of props.events) {
    if (!event.startAt || !event.endAt) continue
    const [startDate] = event.startAt.split('T')
    const [endDate] = event.endAt.split('T')
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T23:59:59')
    // Iterate each day in the range
    let cur = new Date(start)
    while (cur <= end) {
      const k = dateKey(cur)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(event)
      cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000)
    }
  }
  return map
})

// HTML5 DnD state
const draggingEventId = ref<string | null>(null)
const draggingEvent = computed(() => props.events.find(e => e.id === draggingEventId.value) ?? null)

function onDragStart(event: DragEvent, calEvent: CalendarEvent) {
  draggingEventId.value = calEvent.id
  event.dataTransfer?.setData('text/plain', calEvent.id)
  event.dataTransfer!.effectAllowed = 'move'
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'
}

function onDrop(event: DragEvent, targetDate: Date) {
  event.preventDefault()
  const src = draggingEvent.value
  if (!src) return
  draggingEventId.value = null

  const srcDate = new Date(src.startAt.split('T')[0] + 'T00:00:00')
  const dayDiff = Math.round((targetDate.getTime() - srcDate.getTime()) / (24 * 60 * 60 * 1000))
  if (dayDiff === 0) return

  const origStart = new Date(src.startAt)
  const origEnd = new Date(src.endAt)
  const newStart = new Date(origStart.getTime() + dayDiff * 24 * 60 * 60 * 1000)
  const newEnd = new Date(origEnd.getTime() + dayDiff * 24 * 60 * 60 * 1000)

  emit('eventMove', src.id, toLocalISOString(newStart), toLocalISOString(newEnd))
}

function onDragEnd() {
  draggingEventId.value = null
}

const currentMonth = computed(() => props.currentDate.getMonth())
</script>

<template>
  <div class="flex flex-col h-full select-none">
    <!-- Day-of-week header -->
    <div class="grid grid-cols-7 border-b border-default">
      <div
        v-for="label in DAY_LABELS"
        :key="label"
        class="py-2 text-center text-xs font-medium text-muted"
      >
        {{ label }}
      </div>
    </div>

    <!-- Calendar grid -->
    <div class="flex-1 grid"
      :style="`grid-template-rows: repeat(${weeks.length}, 1fr)`"
    >
      <div
        v-for="(week, wi) in weeks"
        :key="wi"
        class="grid grid-cols-7 border-b border-default"
      >
        <div
          v-for="day in week"
          :key="dateKey(day)"
          class="min-h-0 border-r border-default last:border-r-0 p-1 flex flex-col gap-0.5 cursor-pointer hover:bg-muted/30 transition-colors"
          :class="{ 'bg-muted/10': day.getMonth() !== currentMonth }"
          @click="$emit('dayClick', day)"
          @dragover="onDragOver"
          @drop="onDrop($event, day)"
        >
          <!-- Date number -->
          <div class="flex items-center justify-center mb-0.5">
            <span
              class="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full"
              :class="[
                isToday(day) ? 'bg-primary text-white' : '',
                day.getMonth() !== currentMonth ? 'text-muted' : 'text-default',
              ]"
            >
              {{ day.getDate() }}
            </span>
          </div>

          <!-- Events -->
          <template v-if="eventsByDay.get(dateKey(day))">
            <ProtoCalendarEvent
              v-for="event in eventsByDay.get(dateKey(day))!.slice(0, MAX_VISIBLE)"
              :key="event.id"
              :event="event"
              view="month"
              draggable="true"
              class="shrink-0"
              :class="{ 'opacity-50': draggingEventId === event.id }"
              @click="$emit('eventClick', event)"
              @dragstart="onDragStart($event, event)"
              @dragend="onDragEnd"
            />
            <UButton
              v-if="(eventsByDay.get(dateKey(day))?.length ?? 0) > MAX_VISIBLE"
              variant="ghost"
              color="neutral"
              size="xs"
              class="w-full text-left text-xs"
              @click.stop="$emit('dayClick', day)"
            >
              +{{ (eventsByDay.get(dateKey(day))?.length ?? 0) - MAX_VISIBLE }} more
            </UButton>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
