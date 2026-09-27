<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CalendarEvent } from '../types/calendar'
import {
  buildMonthWeeks,
  dateKey,
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
  externalDrop: [startAt: string, endAt: string, allDay: boolean, data: string]
}>()

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_VISIBLE = 3

const weeks = computed(() =>
  buildMonthWeeks(props.currentDate.getFullYear(), props.currentDate.getMonth()),
)

// All days in a flat list for grid traversal
const allDays = computed(() => weeks.value.flat())

// Build a map of dateKey → events (multi-day events appear in every spanned day)
const eventsByDay = computed(() => {
  const map = new Map<string, CalendarEvent[]>()
  for (const event of props.events) {
    if (!event.startAt || !event.endAt) continue
    const [startDate] = event.startAt.split('T')
    const [endDate] = event.endAt.split('T')
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T23:59:59')
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

const currentMonth = computed(() => props.currentDate.getMonth())

// ── Pointer-based drag (move) ─────────────────────────────────────────────────

interface EventDrag {
  eventId: string
  origStartAt: string
  origEndAt: string
  // client coords of pointer for ghost position
  ghostX: number
  ghostY: number
  // Date under pointer for move target
  targetDateKey: string | null
}

const eventDrag = ref<EventDrag | null>(null)
const suppressNextClick = ref(false)

const draggedEvent = computed(() =>
  eventDrag.value ? props.events.find(e => e.id === eventDrag.value!.eventId) ?? null : null,
)

function onEventPointerDown(e: PointerEvent, ev: CalendarEvent) {
  e.preventDefault()
  e.stopPropagation()
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  eventDrag.value = {
    eventId: ev.id,
    origStartAt: ev.startAt,
    origEndAt: ev.endAt,
    ghostX: e.clientX,
    ghostY: e.clientY,
    targetDateKey: dateKey(new Date(ev.startAt.split('T')[0] + 'T12:00:00')),
  }
}

function onGridPointerMove(e: PointerEvent) {
  if (!eventDrag.value && !eventResize.value) return
  // The dragged event holds the pointer capture, so day cells get no pointerenter while dragging: find the day
  // under the pointer instead.
  const dayKey = (document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-day-key]') as HTMLElement | null)?.dataset.dayKey
  if (eventDrag.value) {
    eventDrag.value.ghostX = e.clientX
    eventDrag.value.ghostY = e.clientY
    if (dayKey) eventDrag.value.targetDateKey = dayKey
  }
  if (eventResize.value) {
    eventResize.value.ghostX = e.clientX
    eventResize.value.ghostY = e.clientY
    if (dayKey) eventResize.value.targetDateKey = dayKey
  }
}

function onGridPointerUp() {
  if (eventDrag.value) {
    const state = eventDrag.value
    const ev = props.events.find(ev => ev.id === state.eventId)
    if (ev && state.targetDateKey) {
      const targetDK = state.targetDateKey
      const origDK = dateKey(new Date(state.origStartAt.split('T')[0] + 'T12:00:00'))
      if (targetDK !== origDK) {
        // Find the actual date from allDays
        const targetDate = allDays.value.find(d => dateKey(d) === targetDK)
        if (targetDate) {
          const srcDate = new Date(state.origStartAt.split('T')[0] + 'T00:00:00')
          const dayDiff = Math.round((targetDate.getTime() - srcDate.getTime()) / (24 * 60 * 60 * 1000))
          const origStart = new Date(state.origStartAt)
          const origEnd = new Date(state.origEndAt)
          const newStart = new Date(origStart.getTime() + dayDiff * 24 * 60 * 60 * 1000)
          const newEnd = new Date(origEnd.getTime() + dayDiff * 24 * 60 * 60 * 1000)
          emit('eventMove', ev.id, toLocalISOString(newStart), toLocalISOString(newEnd))
        }
        suppressNextClick.value = true
        setTimeout(() => { suppressNextClick.value = false }, 300)
      }
    }
    eventDrag.value = null
    return
  }

  if (eventResize.value) {
    const state = eventResize.value
    const ev = props.events.find(ev => ev.id === state.eventId)
    if (ev && state.targetDateKey) {
      const targetDK = state.targetDateKey
      const origDK = dateKey(new Date(state.origEndAt.split('T')[0] + 'T12:00:00'))
      if (targetDK !== origDK) {
        const targetDate = allDays.value.find(d => dateKey(d) === targetDK)
        if (targetDate) {
          const origStart = new Date(state.origStartAt.split('T')[0] + 'T00:00:00')
          if (targetDate >= origStart) {
            const pad = (n: number) => String(n).padStart(2, '0')
            const newEndStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`
            emit('eventMove', ev.id, ev.startAt, `${newEndStr}T${ev.endAt.split('T')[1] ?? '23:59:00'}`)
          }
        }
        suppressNextClick.value = true
        setTimeout(() => { suppressNextClick.value = false }, 300)
      }
    }
    eventResize.value = null
  }
}

function onGridPointerCancel() {
  eventDrag.value = null
  eventResize.value = null
}

// ── Pointer-based resize (right-edge drag) ────────────────────────────────────

interface EventResize {
  eventId: string
  origStartAt: string
  origEndAt: string
  ghostX: number
  ghostY: number
  targetDateKey: string | null
}

const eventResize = ref<EventResize | null>(null)

function onEventResizePointerDown(e: PointerEvent, ev: CalendarEvent) {
  e.preventDefault()
  e.stopPropagation()
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  eventResize.value = {
    eventId: ev.id,
    origStartAt: ev.startAt,
    origEndAt: ev.endAt,
    ghostX: e.clientX,
    ghostY: e.clientY,
    targetDateKey: dateKey(new Date(ev.endAt.split('T')[0] + 'T12:00:00')),
  }
}

function isEventLastDay(ev: CalendarEvent, day: Date): boolean {
  return dateKey(day) === dateKey(new Date(ev.endAt.split('T')[0] + 'T12:00:00'))
}

// ── Drop target highlight ─────────────────────────────────────────────────────

const externalDropTarget = ref<string | null>(null)

function onExternalDragOver(e: DragEvent, day: Date) {
  if (eventDrag.value) return // handled by pointer events
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
  externalDropTarget.value = dateKey(day)
}

function onExternalDragLeave() {
  externalDropTarget.value = null
}

function onExternalDrop(e: DragEvent, targetDate: Date) {
  e.preventDefault()
  externalDropTarget.value = null
  const data = e.dataTransfer?.getData('application/x-task') || e.dataTransfer?.getData('text/plain')
  if (!data) return
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`
  emit('externalDrop', `${dateStr}T00:00:00`, `${dateStr}T23:59:59`, true, data)
}

// Ghost event label
const ghostTargetDate = computed(() => {
  if (eventDrag.value?.targetDateKey) {
    return allDays.value.find(d => dateKey(d) === eventDrag.value!.targetDateKey) ?? null
  }
  return null
})

const resizeTargetDate = computed(() => {
  if (eventResize.value?.targetDateKey) {
    return allDays.value.find(d => dateKey(d) === eventResize.value!.targetDateKey) ?? null
  }
  return null
})
</script>

<template>
  <div
    class="flex flex-col h-full select-none"
    @pointermove="onGridPointerMove"
    @pointerup="onGridPointerUp"
    @pointercancel="onGridPointerCancel"
  >
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
    <div
      class="flex-1 grid"
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
          class="min-h-0 border-r border-default last:border-r-0 p-1 flex flex-col gap-0.5 cursor-pointer transition-colors"
          :class="[
            day.getMonth() !== currentMonth ? 'bg-muted/10' : '',
            // Highlight when dragging an event over this day
            eventDrag?.targetDateKey === dateKey(day) ? 'bg-primary/10 ring-1 ring-inset ring-primary/40'
            : eventResize?.targetDateKey === dateKey(day) ? 'bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/40'
              : externalDropTarget === dateKey(day) ? 'bg-primary/10 ring-1 ring-inset ring-primary/40'
                : 'hover:bg-muted/30',
          ]"
          :data-day-key="dateKey(day)"
          @click="!suppressNextClick && $emit('dayClick', day)"
          @dragover="onExternalDragOver($event, day)"
          @dragleave="onExternalDragLeave"
          @drop="onExternalDrop($event, day)"
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
            <div
              v-for="event in eventsByDay.get(dateKey(day))!.slice(0, MAX_VISIBLE)"
              :key="event.id"
              class="relative group/ev shrink-0"
              :class="{
                'opacity-40': eventDrag?.eventId === event.id || eventResize?.eventId === event.id,
                'cursor-grabbing': eventDrag?.eventId === event.id,
              }"
              @pointerdown="onEventPointerDown($event, event)"
              @click.stop="!suppressNextClick && $emit('eventClick', event)"
            >
              <!-- pointer-events-none: the event swallows clicks (@click.stop); the wrapper above handles them, as in week/day -->
              <ProtoCalendarEvent
                :event="event"
                view="month"
                class="pointer-events-none"
              />
              <!-- Right-edge resize handle (last day of event only) -->
              <div
                v-if="isEventLastDay(event, day)"
                class="absolute right-0 top-0 bottom-0 w-2 flex items-center justify-center opacity-0 group-hover/ev:opacity-100 transition-opacity z-10"
                style="cursor: ew-resize"
                @pointerdown.stop="onEventResizePointerDown($event, event)"
              >
                <div class="w-0.5 h-2.5 rounded-full bg-current opacity-60" />
              </div>
            </div>
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

    <!-- Floating ghost while dragging an event -->
    <div
      v-if="eventDrag && draggedEvent"
      class="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2"
      :style="{ left: `${eventDrag.ghostX}px`, top: `${eventDrag.ghostY}px` }"
    >
      <div
        class="rounded px-2 py-1 text-xs font-medium shadow-lg ring-2 ring-primary opacity-90 min-w-16 max-w-32 truncate"
        style="background: color-mix(in srgb, var(--color-primary-500) 15%, white)"
      >
        <div class="font-semibold text-primary truncate">
          {{ draggedEvent.title || '(untitled)' }}
        </div>
        <div
          v-if="ghostTargetDate"
          class="text-primary/70 text-[10px] mt-0.5"
        >
          → {{ ghostTargetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }}
        </div>
      </div>
    </div>

    <!-- Floating ghost while resizing an event -->
    <div
      v-if="eventResize"
      class="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2"
      :style="{ left: `${eventResize.ghostX}px`, top: `${eventResize.ghostY}px` }"
    >
      <div
        class="rounded px-2 py-1 text-xs font-medium shadow-lg ring-2 ring-emerald-500 opacity-90"
        style="background: color-mix(in srgb, var(--color-emerald-500) 15%, white)"
      >
        <div class="text-emerald-700 dark:text-emerald-400">
          <template v-if="resizeTargetDate">
            Ends {{ resizeTargetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }}
          </template>
          <template v-else>
            Resize
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
