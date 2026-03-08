<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { CalendarEvent } from '../types/calendar'
import {
  addDays,
  buildISOAt,
  computeOverlapLayout,
  dateKey,
  formatHour,
  isToday,
  isSameDay,
  minutesToTimeLabel,
  toLocalISOString,
} from '../utils/calendarLayout'

const props = defineProps<{
  events: CalendarEvent[]
  currentDate: Date
}>()

const emit = defineEmits<{
  rangeSelect: [startAt: string, endAt: string]
  eventClick: [event: CalendarEvent]
  eventMove: [id: string, newStartAt: string, newEndAt: string]
  externalDrop: [startAt: string, endAt: string, allDay: boolean, data: string]
}>()

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const GRID_HEIGHT = 1440 // 1px per minute
const scrollRef = ref<HTMLElement | null>(null)
const gridRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (scrollRef.value) scrollRef.value.scrollTop = 480
})

// Week days Sun–Sat
const weekDays = computed(() => {
  const start = new Date(props.currentDate)
  start.setDate(props.currentDate.getDate() - props.currentDate.getDay())
  start.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
})

const windowStart = computed(() => weekDays.value[0])
const windowEnd = computed(() => { const e = addDays(weekDays.value[6], 1); e.setHours(0, 0, 0, 0); return e })

const allDayEvents = computed(() =>
  props.events.filter(e => e.allDay || (e.startAt && e.endAt && e.startAt.split('T')[0] !== e.endAt.split('T')[0])),
)

const timedEvents = computed(() =>
  props.events.filter(e => !e.allDay && e.startAt && e.endAt && e.startAt.split('T')[0] === e.endAt.split('T')[0]),
)

const overlapLayout = computed(() => computeOverlapLayout(timedEvents.value, windowStart.value, windowEnd.value))

function getTimedEventsForDay(day: Date): CalendarEvent[] {
  const k = dateKey(day)
  return timedEvents.value.filter(e => dateKey(new Date(e.startAt.split('T')[0] + 'T12:00:00')) === k)
}

function getAllDayEventsForDay(day: Date): CalendarEvent[] {
  const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999)
  return allDayEvents.value.filter(e => {
    const s = new Date(e.startAt.split('T')[0] + 'T00:00:00')
    const end = new Date(e.endAt.split('T')[0] + 'T23:59:59')
    return s <= dayEnd && end >= dayStart
  })
}

function eventTopPct(ev: CalendarEvent): number {
  const [, t = '00:00:00'] = ev.startAt.split('T')
  const [h, m] = t.split(':').map(Number)
  return (h * 60 + m) / GRID_HEIGHT * 100
}

function eventHeightPct(ev: CalendarEvent): number {
  const [, st = '00:00:00'] = ev.startAt.split('T')
  const [sh, sm] = st.split(':').map(Number)
  const [, et = '01:00:00'] = ev.endAt.split('T')
  const [eh, em] = et.split(':').map(Number)
  return Math.max(30, (eh * 60 + em) - (sh * 60 + sm)) / GRID_HEIGHT * 100
}

function eventLeft(id: string) {
  const l = overlapLayout.value.get(id)
  return l ? `${(l.col / l.total) * 100}%` : '0%'
}

function eventWidth(id: string) {
  const l = overlapLayout.value.get(id)
  return l ? `${(1 / l.total) * 100 - 1}%` : '99%'
}

// ── Shared pointer coord helpers ──────────────────────────────────────────────
// getBoundingClientRect() is already viewport-relative and accounts for scroll,
// so relY = clientY - rect.top gives the correct position within the 1440px grid.
// Do NOT add scrollTop — that would double-count it.

function getGridMinute(clientY: number): number {
  const rect = gridRef.value!.getBoundingClientRect()
  const relY = clientY - rect.top
  return Math.max(0, Math.min(23 * 60 + 59, Math.round(relY / 15) * 15))
}

function getGridDayIdx(clientX: number): number {
  const rect = gridRef.value!.getBoundingClientRect()
  const colWidth = (rect.width - 48) / 7
  return Math.max(0, Math.min(6, Math.floor((clientX - rect.left - 48) / colWidth)))
}

// ── Event drag (pointer DnD) ──────────────────────────────────────────────────

interface EventDrag {
  eventId: string
  origStartAt: string
  origEndAt: string
  startY: number
  startX: number
  snappedMinutes: number
  snappedDays: number
}

const eventDrag = ref<EventDrag | null>(null)
const ghostEventId = ref<string | null>(null)
const ghostDeltaMin = ref(0)
const ghostDeltaDays = ref(0)
// Suppress the click that browsers fire after pointerup when a drag occurred
const suppressNextClick = ref(false)

// ── Event resize (bottom-handle drag) ─────────────────────────────────────────

interface EventResize {
  eventId: string
  startMin: number
  origEndMin: number
  snappedEndMin: number
}

const eventResize = ref<EventResize | null>(null)
const ghostResizeEventId = ref<string | null>(null)
const ghostResizeEndMin = ref(0)

function onEventPointerDown(e: PointerEvent, ev: CalendarEvent) {
  e.preventDefault()
  e.stopPropagation() // prevent grid from starting range selection
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  eventDrag.value = { eventId: ev.id, origStartAt: ev.startAt, origEndAt: ev.endAt, startY: e.clientY, startX: e.clientX, snappedMinutes: 0, snappedDays: 0 }
  ghostEventId.value = ev.id
  ghostDeltaMin.value = 0
  ghostDeltaDays.value = 0
}

function onResizePointerDown(e: PointerEvent, ev: CalendarEvent) {
  e.preventDefault()
  e.stopPropagation()
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

  const [, st = '00:00:00'] = ev.startAt.split('T')
  const [sh, sm] = st.split(':').map(Number)
  const [, et = '01:00:00'] = ev.endAt.split('T')
  const [eh, em] = et.split(':').map(Number)
  const startMin = sh * 60 + sm
  const origEndMin = eh * 60 + em

  eventResize.value = { eventId: ev.id, startMin, origEndMin, snappedEndMin: origEndMin }
  ghostResizeEventId.value = ev.id
  ghostResizeEndMin.value = origEndMin
}

const ghostEvent = computed(() => ghostEventId.value ? props.events.find(e => e.id === ghostEventId.value) ?? null : null)

function ghostTopPct(): number {
  if (!ghostEvent.value) return 0
  const [, t = '00:00:00'] = ghostEvent.value.startAt.split('T')
  const [h, m] = t.split(':').map(Number)
  return Math.max(0, Math.min(23 * 60 + 30, h * 60 + m + ghostDeltaMin.value)) / GRID_HEIGHT * 100
}

function ghostColIdx(): number {
  if (!ghostEvent.value) return 0
  const origDayStr = ghostEvent.value.startAt.split('T')[0]
  const origIdx = weekDays.value.findIndex(d => dateKey(d) === dateKey(new Date(origDayStr + 'T12:00:00')))
  return Math.max(0, Math.min(6, (origIdx === -1 ? 0 : origIdx) + ghostDeltaDays.value))
}

const ghostResizeEvent = computed(() =>
  ghostResizeEventId.value ? props.events.find(e => e.id === ghostResizeEventId.value) ?? null : null,
)

function ghostResizeTopPct(): number {
  if (!ghostResizeEvent.value) return 0
  const [, t = '00:00:00'] = ghostResizeEvent.value.startAt.split('T')
  const [h, m] = t.split(':').map(Number)
  return (h * 60 + m) / GRID_HEIGHT * 100
}

function ghostResizeHeightPct(): number {
  if (!ghostResizeEvent.value) return 0
  const [, st = '00:00:00'] = ghostResizeEvent.value.startAt.split('T')
  const [sh, sm] = st.split(':').map(Number)
  return Math.max(15, ghostResizeEndMin.value - (sh * 60 + sm)) / GRID_HEIGHT * 100
}

function ghostResizeColIdx(): number {
  if (!ghostResizeEvent.value) return 0
  const dayStr = ghostResizeEvent.value.startAt.split('T')[0]
  const idx = weekDays.value.findIndex(d => dateKey(d) === dateKey(new Date(dayStr + 'T12:00:00')))
  return idx === -1 ? 0 : idx
}

// ── Range selection (click-drag on empty space) ───────────────────────────────

interface RangeSelection {
  startMin: number
  endMin: number
  dayIdx: number
}

const selection = ref<RangeSelection | null>(null)

const selectionLabel = computed(() => {
  if (!selection.value) return ''
  const { startMin, endMin } = selection.value
  return `${minutesToTimeLabel(startMin)} – ${minutesToTimeLabel(endMin)}`
})

function onGridPointerDown(e: PointerEvent) {
  if (eventDrag.value) return // an event drag is starting (stopPropagation didn't fire yet?)
  const rect = gridRef.value?.getBoundingClientRect()
  if (!rect) return
  // Ignore clicks in the time gutter (left 48px)
  if (e.clientX - rect.left < 48) return

  e.preventDefault()
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

  const dayIdx = getGridDayIdx(e.clientX)
  const startMin = getGridMinute(e.clientY)

  selection.value = { startMin, endMin: Math.min(24 * 60, startMin + 30), dayIdx }
}

// ── Unified grid pointermove / pointerup ──────────────────────────────────────

function onGridPointerMove(e: PointerEvent) {
  // Event resize
  if (eventResize.value) {
    const raw = getGridMinute(e.clientY)
    const snapped = Math.min(23 * 60 + 45, Math.max(eventResize.value.startMin + 15, Math.round(raw / 15) * 15))
    eventResize.value.snappedEndMin = snapped
    ghostResizeEndMin.value = snapped
    return
  }

  // Event drag
  if (eventDrag.value) {
    const state = eventDrag.value
    if (!gridRef.value) return
    const rect = gridRef.value.getBoundingClientRect()
    const colWidth = (rect.width - 48) / 7

    const rawDeltaY = e.clientY - state.startY
    const pxPerMin = rect.height / GRID_HEIGHT
    const snappedMin = Math.round(rawDeltaY / pxPerMin / 15) * 15

    const rawDeltaX = e.clientX - state.startX
    const snappedDays = Math.round(rawDeltaX / colWidth)

    state.snappedMinutes = snappedMin
    state.snappedDays = snappedDays
    ghostDeltaMin.value = snappedMin
    ghostDeltaDays.value = snappedDays
    return
  }

  // Range selection
  if (selection.value) {
    const endMin = Math.max(selection.value.startMin + 15, Math.min(24 * 60, getGridMinute(e.clientY)))
    selection.value = { ...selection.value, endMin }
  }
}

function onGridPointerUp(e: PointerEvent) {
  // Event resize end
  if (eventResize.value) {
    const state = eventResize.value
    const ev = props.events.find(ev => ev.id === state.eventId)
    const didResize = state.snappedEndMin !== state.origEndMin
    if (ev && didResize) {
      const eventDate = new Date(ev.startAt.split('T')[0] + 'T12:00:00')
      emit('eventMove', ev.id, ev.startAt, buildISOAt(eventDate, state.snappedEndMin))
    }
    if (didResize) {
      suppressNextClick.value = true
      setTimeout(() => { suppressNextClick.value = false }, 300)
    }
    eventResize.value = null
    ghostResizeEventId.value = null
    return
  }

  // Event drag end
  if (eventDrag.value) {
    const state = eventDrag.value
    const ev = props.events.find(ev => ev.id === state.eventId)
    const didMove = state.snappedMinutes !== 0 || state.snappedDays !== 0
    if (ev && didMove) {
      const origStart = new Date(ev.startAt)
      const dur = new Date(ev.endAt).getTime() - origStart.getTime()
      const newStart = new Date(origStart.getTime() + state.snappedDays * 86400000)
      newStart.setMinutes(newStart.getMinutes() + state.snappedMinutes)
      const totalMin = newStart.getHours() * 60 + newStart.getMinutes()
      if (totalMin < 0) newStart.setHours(0, 0, 0, 0)
      if (totalMin > 23 * 60 + 30) newStart.setHours(23, 30, 0, 0)
      emit('eventMove', ev.id, toLocalISOString(newStart), toLocalISOString(new Date(newStart.getTime() + dur)))
    }
    if (didMove) {
      suppressNextClick.value = true
      setTimeout(() => { suppressNextClick.value = false }, 300)
    }
    eventDrag.value = null
    ghostEventId.value = null
    return
  }

  // Range selection end
  if (selection.value) {
    const sel = selection.value
    const day = weekDays.value[sel.dayIdx]
    if (sel.endMin > sel.startMin) {
      emit('rangeSelect', buildISOAt(day, sel.startMin), buildISOAt(day, Math.min(23 * 60 + 59, sel.endMin)))
    }
    selection.value = null
  }
}

function onGridPointerCancel() {
  eventDrag.value = null
  ghostEventId.value = null
  eventResize.value = null
  ghostResizeEventId.value = null
  selection.value = null
}

// ── External drop (HTML5 DnD — tasks from panel) ──────────────────────────────

const dragoverDayIdx = ref<number | null>(null)
const dragoverMinute = ref<number | null>(null)

function onColumnDragOver(e: DragEvent, dayIdx: number) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
  dragoverDayIdx.value = dayIdx
  const col = e.currentTarget as HTMLElement
  dragoverMinute.value = Math.max(0, Math.min(23 * 60, Math.round(e.offsetY / 15) * 15))
}

function onColumnDragLeave() {
  dragoverDayIdx.value = null
  dragoverMinute.value = null
}

function onColumnDrop(e: DragEvent, day: Date) {
  e.preventDefault()
  const data = e.dataTransfer?.getData('application/x-task') || e.dataTransfer?.getData('text/plain')
  dragoverDayIdx.value = null
  dragoverMinute.value = null
  if (!data) return
  const startMin = Math.max(0, Math.min(23 * 60, Math.round(e.offsetY / 15) * 15))
  const endMin = Math.min(24 * 60, startMin + 60)
  emit('externalDrop', buildISOAt(day, startMin), buildISOAt(day, endMin), false, data)
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

    <!-- All-day band -->
    <div
      v-if="allDayEvents.length > 0"
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
          v-for="ev in getAllDayEventsForDay(day)"
          :key="ev.id"
          :event="ev"
          view="week"
          @click="$emit('eventClick', ev)"
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
        class="relative grid select-none"
        style="grid-template-columns: 48px repeat(7, 1fr); touch-action: none"
        :style="`height: ${GRID_HEIGHT}px`"
        @pointerdown="onGridPointerDown"
        @pointermove="onGridPointerMove"
        @pointerup="onGridPointerUp"
        @pointercancel="onGridPointerCancel"
      >
        <!-- Time gutter -->
        <div class="relative border-r border-default pointer-events-none">
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
          class="relative border-r border-default last:border-r-0 cursor-cell"
          @dragover="onColumnDragOver($event, dayIdx)"
          @dragleave="onColumnDragLeave"
          @drop="onColumnDrop($event, day)"
        >
          <!-- Hour lines -->
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
            v-for="ev in getTimedEventsForDay(day)"
            :key="ev.id"
            class="absolute px-0.5 cursor-grab active:cursor-grabbing group"
            :style="{
              top: `${eventTopPct(ev)}%`,
              height: `${eventHeightPct(ev)}%`,
              left: eventLeft(ev.id),
              width: eventWidth(ev.id),
              opacity: ghostEventId === ev.id || ghostResizeEventId === ev.id ? 0.25 : 1,
              zIndex: ghostEventId === ev.id ? 0 : 1,
            }"
            @pointerdown="onEventPointerDown($event, ev)"
            @click="!suppressNextClick && $emit('eventClick', ev)"
          >
            <ProtoCalendarEvent
              :event="ev"
              view="week"
              class="h-full pointer-events-none"
            />
            <div
              class="absolute bottom-0 left-0 right-0 h-2 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style="cursor: ns-resize"
              @pointerdown.stop="onResizePointerDown($event, ev)"
            >
              <div class="w-6 h-0.5 rounded-full bg-current opacity-60" />
            </div>
          </div>

          <!-- Range selection ghost -->
          <div
            v-if="selection && selection.dayIdx === dayIdx"
            class="absolute pointer-events-none z-10 left-1 right-1 rounded border border-primary/60"
            style="background: color-mix(in srgb, var(--color-primary-500) 15%, transparent)"
            :style="{
              top: `${(selection.startMin / GRID_HEIGHT) * 100}%`,
              height: `${Math.max(15, selection.endMin - selection.startMin) / GRID_HEIGHT * 100}%`,
            }"
          >
            <span class="text-xs font-medium px-1 pt-0.5 block leading-tight"
              style="color: var(--color-primary-600)"
            >
              {{ selectionLabel }}
            </span>
          </div>

          <!-- External drop indicator -->
          <div
            v-if="dragoverDayIdx === dayIdx && dragoverMinute !== null"
            class="absolute pointer-events-none z-10 left-0 right-0 rounded-r border-l-2 border-primary"
            style="background: color-mix(in srgb, var(--color-primary-500) 12%, transparent)"
            :style="{
              top: `${(dragoverMinute / GRID_HEIGHT) * 100}%`,
              height: `${60 / GRID_HEIGHT * 100}%`,
            }"
          />
        </div>

        <!-- Event drag ghost overlay -->
        <div
          v-if="ghostEvent && eventDrag"
          class="absolute pointer-events-none opacity-80 z-20 px-0.5"
          :style="{
            top: `${ghostTopPct()}%`,
            height: `${eventHeightPct(ghostEvent)}%`,
            left: `calc(48px + ${(ghostColIdx() / 7) * 100}%)`,
            width: `calc(${(1 / 7) * 100}% - 2px)`,
          }"
        >
          <ProtoCalendarEvent
            :event="ghostEvent"
            view="week"
            class="h-full outline outline-2 outline-primary"
          />
        </div>

        <!-- Resize ghost overlay -->
        <div
          v-if="ghostResizeEvent && eventResize"
          class="absolute pointer-events-none opacity-90 z-20 px-0.5"
          :style="{
            top: `${ghostResizeTopPct()}%`,
            height: `${ghostResizeHeightPct()}%`,
            left: `calc(48px + ${(ghostResizeColIdx() / 7) * 100}%)`,
            width: `calc(${(1 / 7) * 100}% - 2px)`,
          }"
        >
          <ProtoCalendarEvent
            :event="ghostResizeEvent"
            view="week"
            class="h-full outline outline-2 outline-primary"
          />
        </div>
      </div>
    </div>
  </div>
</template>
