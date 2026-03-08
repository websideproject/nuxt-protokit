<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { CalendarEvent } from '../types/calendar'
import {
  computeOverlapLayout,
  formatHour,
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
const GRID_HEIGHT = 1440
const scrollRef = ref<HTMLElement | null>(null)
const gridRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (scrollRef.value) scrollRef.value.scrollTop = 480
})

const currentDayStr = computed(() => {
  const d = props.currentDate
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
})

// All-day events: allDay OR multi-day
const allDayEvents = computed(() =>
  props.events.filter((e) => {
    if (e.allDay) return true
    if (!e.startAt || !e.endAt) return false
    return e.startAt.split('T')[0] !== e.endAt.split('T')[0]
  }),
)

// Today's all-day events
const todayAllDay = computed(() =>
  allDayEvents.value.filter((e) => {
    const startD = new Date(e.startAt.split('T')[0] + 'T00:00:00')
    const endD = new Date(e.endAt.split('T')[0] + 'T23:59:59')
    const dayStart = new Date(props.currentDate); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(props.currentDate); dayEnd.setHours(23, 59, 59, 999)
    return startD <= dayEnd && endD >= dayStart
  }),
)

// Timed events for today only
const timedEvents = computed(() =>
  props.events.filter(e =>
    !e.allDay
    && e.startAt
    && e.endAt
    && e.startAt.split('T')[0] === currentDayStr.value
    && e.startAt.split('T')[0] === e.endAt.split('T')[0],
  ),
)

const windowStart = computed(() => {
  const s = new Date(props.currentDate); s.setHours(0, 0, 0, 0); return s
})
const windowEnd = computed(() => {
  const e = new Date(props.currentDate); e.setHours(23, 59, 59, 999); return e
})

const overlapLayout = computed(() =>
  computeOverlapLayout(timedEvents.value, windowStart.value, windowEnd.value),
)

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
  snappedMinutes: number
}

const drag = ref<DragState | null>(null)
const ghostId = ref<string | null>(null)
const ghostDeltaMinutes = ref(0)

function onEventPointerDown(e: PointerEvent, event: CalendarEvent) {
  e.preventDefault()
  e.stopPropagation()
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  drag.value = {
    eventId: event.id,
    origStartAt: event.startAt,
    origEndAt: event.endAt,
    startY: e.clientY,
    snappedMinutes: 0,
  }
  ghostId.value = event.id
  ghostDeltaMinutes.value = 0
}

function onGridPointerMove(e: PointerEvent) {
  const state = drag.value
  if (!state || !gridRef.value) return
  e.preventDefault()

  const gridRect = gridRef.value.getBoundingClientRect()
  const pxPerMin = gridRect.height / GRID_HEIGHT
  const rawDelta = e.clientY - state.startY
  const snapped = Math.round(rawDelta / pxPerMin / 15) * 15

  state.snappedMinutes = snapped
  ghostDeltaMinutes.value = snapped
}

function onGridPointerUp() {
  const state = drag.value
  if (!state) return

  const event = props.events.find(ev => ev.id === state.eventId)
  if (event && state.snappedMinutes !== 0) {
    const origStart = new Date(event.startAt)
    const dur = new Date(event.endAt).getTime() - origStart.getTime()
    origStart.setMinutes(origStart.getMinutes() + state.snappedMinutes)
    const totalMin = origStart.getHours() * 60 + origStart.getMinutes()
    if (totalMin < 0) origStart.setHours(0, 0, 0, 0)
    if (totalMin > 23 * 60 + 30) origStart.setHours(23, 30, 0, 0)
    const newEnd = new Date(origStart.getTime() + dur)
    emit('eventMove', event.id, toLocalISOString(origStart), toLocalISOString(newEnd))
  }

  drag.value = null
  ghostId.value = null
  ghostDeltaMinutes.value = 0
}

function onGridPointerCancel() {
  drag.value = null
  ghostId.value = null
  ghostDeltaMinutes.value = 0
}

const ghostEvent = computed(() => {
  if (!ghostId.value) return null
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

function handleGridClick(e: MouseEvent) {
  if (drag.value) return
  const hour = Math.floor((e.offsetY / GRID_HEIGHT) * 24)
  emit('dayClick', props.currentDate, hour)
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- All-day band -->
    <div
      v-if="todayAllDay.length > 0"
      class="border-b border-default p-1 shrink-0 flex flex-col gap-0.5"
    >
      <ProtoCalendarEvent
        v-for="event in todayAllDay"
        :key="event.id"
        :event="event"
        view="day"
        @click="$emit('eventClick', event)"
      />
    </div>

    <!-- Scrollable time grid -->
    <div
      ref="scrollRef"
      class="flex-1 overflow-y-auto"
    >
      <div
        ref="gridRef"
        class="relative grid"
        style="grid-template-columns: 48px 1fr; touch-action: none"
        :style="`height: ${GRID_HEIGHT}px`"
        @pointermove="onGridPointerMove"
        @pointerup="onGridPointerUp"
        @pointercancel="onGridPointerCancel"
        @click.self="handleGridClick"
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

        <!-- Day column -->
        <div
          class="relative"
          @click.self="handleGridClick"
        >
          <!-- Hour lines + half-hour dashes -->
          <template v-for="h in HOURS" :key="h">
            <div
              class="absolute w-full pointer-events-none"
              style="border-top: 1px solid rgba(128,128,128,0.15)"
              :style="`top: ${h * 60}px`"
            />
            <div
              class="absolute w-full pointer-events-none"
              style="border-top: 1px dashed rgba(128,128,128,0.1)"
              :style="`top: ${h * 60 + 30}px`"
            />
          </template>

          <!-- Timed events -->
          <div
            v-for="event in timedEvents"
            :key="event.id"
            class="absolute px-1 cursor-grab active:cursor-grabbing"
            :style="{
              top: `${eventTopPct(event)}%`,
              height: `${eventHeightPct(event)}%`,
              left: eventLeft(event.id),
              width: eventWidth(event.id),
              opacity: ghostId === event.id ? 0.3 : 1,
              zIndex: ghostId === event.id ? 0 : 1,
            }"
            @pointerdown="onEventPointerDown($event, event)"
          >
            <ProtoCalendarEvent
              :event="event"
              view="day"
              class="h-full"
              @click="$emit('eventClick', event)"
            />
          </div>

          <!-- Ghost overlay -->
          <div
            v-if="ghostEvent && drag"
            class="absolute pointer-events-none opacity-80 z-20 px-1"
            :style="{
              top: `${ghostTopPct()}%`,
              height: `${eventHeightPct(ghostEvent)}%`,
              left: '0%',
              width: '99%',
            }"
          >
            <ProtoCalendarEvent
              :event="ghostEvent"
              view="day"
              class="h-full outline outline-2 outline-primary"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
