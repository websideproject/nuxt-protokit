<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { CalendarEvent } from '../types/calendar'
import {
  addDays,
  computeOverlapLayout,
  dateKey,
  formatHour,
  isToday,
  isSameDay,
  toLocalISOString,
} from '../utils/calendarLayout'

const props = defineProps<{
  events: CalendarEvent[]
  currentDate: Date
}>()

const emit = defineEmits<{
  dayClick: [date: Date, hour: number]
  eventClick: [event: CalendarEvent]
  eventMove: [id: string, newStartAt: string, newEndAt: string]
}>()

const HOURS = Array.from({ length: 24 }, (_, i) => i)
// 1440px total = 1px per minute
const GRID_HEIGHT = 1440
const scrollRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (scrollRef.value) scrollRef.value.scrollTop = 480 // scroll to 8am
})

// Sun–Sat for the current week
const weekDays = computed(() => {
  const startOfWeek = new Date(props.currentDate)
  startOfWeek.setDate(props.currentDate.getDate() - props.currentDate.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek, i))
})

const windowStart = computed(() => weekDays.value[0])
const windowEnd = computed(() => {
  const end = addDays(weekDays.value[6], 1)
  end.setHours(0, 0, 0, 0)
  return end
})

// All-day: allDay flag OR event spans multiple calendar days
const allDayEvents = computed(() =>
  props.events.filter((e) => {
    if (e.allDay) return true
    if (!e.startAt || !e.endAt) return false
    return e.startAt.split('T')[0] !== e.endAt.split('T')[0]
  }),
)

// Timed events: not all-day, starts and ends on same calendar day
const timedEvents = computed(() =>
  props.events.filter((e) => {
    if (!e.startAt || !e.endAt || e.allDay) return false
    return e.startAt.split('T')[0] === e.endAt.split('T')[0]
  }),
)

const overlapLayout = computed(() =>
  computeOverlapLayout(timedEvents.value, windowStart.value, windowEnd.value),
)

function getTimedEventsForDay(day: Date): CalendarEvent[] {
  const dayStr = dateKey(day)
  return timedEvents.value.filter(e => dateKey(new Date(e.startAt.split('T')[0] + 'T12:00:00')) === dayStr)
}

function getAllDayEventsForDay(day: Date): CalendarEvent[] {
  const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999)
  return allDayEvents.value.filter((e) => {
    const startD = new Date(e.startAt.split('T')[0] + 'T00:00:00')
    const endD = new Date(e.endAt.split('T')[0] + 'T23:59:59')
    return startD <= dayEnd && endD >= dayStart
  })
}

// Event positioning (percentage of GRID_HEIGHT)
function eventTopPct(event: CalendarEvent): number {
  const [, time = '00:00:00'] = event.startAt.split('T')
  const [h, m] = time.split(':').map(Number)
  return (h * 60 + m) / GRID_HEIGHT * 100
}

function eventHeightPct(event: CalendarEvent): number {
  const [, st = '00:00:00'] = event.startAt.split('T')
  const [sh, sm] = st.split(':').map(Number)
  const [, et = '01:00:00'] = event.endAt.split('T')
  const [eh, em] = et.split(':').map(Number)
  const dur = Math.max(30, (eh * 60 + em) - (sh * 60 + sm))
  return dur / GRID_HEIGHT * 100
}

function eventLeft(id: string): string {
  const l = overlapLayout.value.get(id)
  return l ? `${(l.col / l.total) * 100}%` : '0%'
}

function eventWidth(id: string): string {
  const l = overlapLayout.value.get(id)
  return l ? `${(1 / l.total) * 100 - 1}%` : '99%'
}

// ── Pointer DnD ───────────────────────────────────────────────────────────────

interface DragState {
  eventId: string
  origStartAt: string
  origEndAt: string
  startY: number
  startX: number
  snappedMinutes: number
  snappedDays: number
}

const drag = ref<DragState | null>(null)
const ghostId = ref<string | null>(null)
// Ghost offset in minutes (for top calc) and days (for column)
const ghostDeltaMinutes = ref(0)
const ghostDeltaDays = ref(0)
const gridRef = ref<HTMLElement | null>(null)

function onEventPointerDown(e: PointerEvent, event: CalendarEvent, dayIdx: number) {
  e.preventDefault()
  e.stopPropagation()
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  drag.value = {
    eventId: event.id,
    origStartAt: event.startAt,
    origEndAt: event.endAt,
    startY: e.clientY,
    startX: e.clientX,
    snappedMinutes: 0,
    snappedDays: 0,
  }
  ghostId.value = event.id
  ghostDeltaMinutes.value = 0
  ghostDeltaDays.value = 0
}

function onGridPointerMove(e: PointerEvent) {
  const state = drag.value
  if (!state || !gridRef.value) return
  e.preventDefault()

  // pxPerMinute: grid is exactly GRID_HEIGHT px tall
  const gridRect = gridRef.value.getBoundingClientRect()
  const pxPerMin = gridRect.height / GRID_HEIGHT
  const colWidth = (gridRect.width - 48) / 7

  const rawDeltaY = e.clientY - state.startY
  const snappedMin = Math.round(rawDeltaY / pxPerMin / 15) * 15

  const rawDeltaX = e.clientX - state.startX
  const snappedDays = Math.round(rawDeltaX / colWidth)

  state.snappedMinutes = snappedMin
  state.snappedDays = snappedDays
  ghostDeltaMinutes.value = snappedMin
  ghostDeltaDays.value = snappedDays
}

function onGridPointerUp(e: PointerEvent) {
  const state = drag.value
  if (!state) return

  const event = props.events.find(ev => ev.id === state.eventId)
  if (event && (state.snappedMinutes !== 0 || state.snappedDays !== 0)) {
    const origStart = new Date(event.startAt)
    const dur = new Date(event.endAt).getTime() - origStart.getTime()

    // Apply day and minute offsets
    const newStart = new Date(origStart.getTime() + state.snappedDays * 24 * 60 * 60 * 1000)
    newStart.setMinutes(newStart.getMinutes() + state.snappedMinutes)

    // Clamp to valid range
    const totalMin = newStart.getHours() * 60 + newStart.getMinutes()
    if (totalMin < 0) newStart.setHours(0, 0, 0, 0)
    if (totalMin > 23 * 60 + 30) newStart.setHours(23, 30, 0, 0)

    const newEnd = new Date(newStart.getTime() + dur)
    emit('eventMove', event.id, toLocalISOString(newStart), toLocalISOString(newEnd))
  }

  drag.value = null
  ghostId.value = null
  ghostDeltaMinutes.value = 0
  ghostDeltaDays.value = 0
}

function onGridPointerCancel() {
  drag.value = null
  ghostId.value = null
}

// Ghost position computed from original + delta
const ghostEvent = computed(() => {
  if (!ghostId.value || !drag.value) return null
  return props.events.find(e => e.id === ghostId.value) ?? null
})

function ghostTopPct(): number {
  if (!ghostEvent.value) return 0
  const [, time = '00:00:00'] = ghostEvent.value.startAt.split('T')
  const [h, m] = time.split(':').map(Number)
  const origMin = h * 60 + m
  const newMin = Math.max(0, Math.min(23 * 60 + 30, origMin + ghostDeltaMinutes.value))
  return (newMin / GRID_HEIGHT) * 100
}

function ghostDayIdx(): number {
  if (!ghostEvent.value || !drag.value) return 0
  // Find which day this event was originally on
  const origDayStr = ghostEvent.value.startAt.split('T')[0]
  const origDayIdx = weekDays.value.findIndex(d => dateKey(d) === dateKey(new Date(origDayStr + 'T12:00:00')))
  return Math.max(0, Math.min(6, (origDayIdx === -1 ? 0 : origDayIdx) + ghostDeltaDays.value))
}

function handleDayClick(e: MouseEvent, day: Date) {
  const hour = Math.floor((e.offsetY / GRID_HEIGHT) * 24)
  emit('dayClick', day, hour)
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Day header row -->
    <div
      class="grid shrink-0 border-b border-default"
      style="grid-template-columns: 48px repeat(7, 1fr)"
    >
      <div class="border-r border-default" />
      <div
        v-for="(day, i) in weekDays"
        :key="i"
        class="py-2 text-center border-r border-default last:border-r-0"
      >
        <p class="text-xs text-muted uppercase tracking-wide">
          {{ ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day.getDay()] }}
        </p>
        <span
          class="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold mt-0.5"
          :class="isToday(day) ? 'bg-primary text-white' : 'text-highlighted'"
        >
          {{ day.getDate() }}
        </span>
      </div>
    </div>

    <!-- All-day band (only when there are all-day events) -->
    <div
      v-if="props.events.some(e => e.allDay || e.startAt?.split('T')[0] !== e.endAt?.split('T')[0])"
      class="grid shrink-0 border-b border-default"
      style="grid-template-columns: 48px repeat(7, 1fr)"
    >
      <div class="border-r border-default flex items-end justify-end pb-1 pr-1">
        <span class="text-xs text-muted">all day</span>
      </div>
      <div
        v-for="(day, i) in weekDays"
        :key="i"
        class="p-0.5 border-r border-default last:border-r-0 flex flex-col gap-0.5 min-h-8"
      >
        <ProtoCalendarEvent
          v-for="event in getAllDayEventsForDay(day)"
          :key="event.id"
          :event="event"
          view="week"
          @click="$emit('eventClick', event)"
        />
      </div>
    </div>

    <!-- Scrollable time grid -->
    <div
      ref="scrollRef"
      class="flex-1 overflow-y-auto"
    >
      <div
        ref="gridRef"
        class="relative grid"
        style="grid-template-columns: 48px repeat(7, 1fr); touch-action: none"
        :style="`height: ${GRID_HEIGHT}px`"
        @pointermove="onGridPointerMove"
        @pointerup="onGridPointerUp"
        @pointercancel="onGridPointerCancel"
      >
        <!-- Time gutter -->
        <div class="relative border-r border-default">
          <div
            v-for="h in HOURS"
            :key="h"
            class="absolute w-full text-right pr-2"
            :style="`top: ${h * 60 - 8}px`"
          >
            <span class="text-xs text-muted/70 leading-none">{{ h === 0 ? '' : formatHour(h) }}</span>
          </div>
        </div>

        <!-- Day columns -->
        <div
          v-for="(day, dayIdx) in weekDays"
          :key="dayIdx"
          class="relative border-r border-default last:border-r-0"
          @click.self="handleDayClick($event, day)"
        >
          <!-- Hour lines -->
          <template v-for="h in HOURS" :key="h">
            <div
              class="absolute w-full pointer-events-none"
              style="border-top: 1px solid rgba(128,128,128,0.15)"
              :style="`top: ${h * 60}px`"
            />
            <!-- Half-hour dashed -->
            <div
              class="absolute w-full pointer-events-none"
              style="border-top: 1px dashed rgba(128,128,128,0.1)"
              :style="`top: ${h * 60 + 30}px`"
            />
          </template>

          <!-- Timed events -->
          <div
            v-for="event in getTimedEventsForDay(day)"
            :key="event.id"
            class="absolute px-0.5 cursor-grab active:cursor-grabbing"
            :style="{
              top: `${eventTopPct(event)}%`,
              height: `${eventHeightPct(event)}%`,
              left: eventLeft(event.id),
              width: eventWidth(event.id),
              opacity: ghostId === event.id ? 0.3 : 1,
              zIndex: ghostId === event.id ? 0 : 1,
            }"
            @pointerdown="onEventPointerDown($event, event, dayIdx)"
          >
            <ProtoCalendarEvent
              :event="event"
              view="week"
              class="h-full"
              @click="$emit('eventClick', event)"
            />
          </div>
        </div>

        <!-- Ghost overlay while dragging -->
        <div
          v-if="ghostEvent && drag"
          class="absolute pointer-events-none opacity-80 z-20 px-0.5"
          :style="{
            top: `${ghostTopPct()}%`,
            height: `${eventHeightPct(ghostEvent)}%`,
            left: `calc(48px + ${(ghostDayIdx() / 7) * 100}%)`,
            width: `calc(${(1 / 7) * 100}% - 2px)`,
          }"
        >
          <ProtoCalendarEvent
            :event="ghostEvent"
            view="week"
            class="h-full outline outline-2 outline-primary"
          />
        </div>
      </div>
    </div>
  </div>
</template>
