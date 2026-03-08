<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { CalendarEvent } from '../types/calendar'
import {
  buildISOAt,
  computeOverlapLayout,
  formatHour,
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

const allDayEvents = computed(() =>
  props.events.filter(e => e.allDay || (e.startAt && e.endAt && e.startAt.split('T')[0] !== e.endAt.split('T')[0])),
)

const todayAllDay = computed(() =>
  allDayEvents.value.filter((e) => {
    const s = new Date(e.startAt.split('T')[0] + 'T00:00:00')
    const end = new Date(e.endAt.split('T')[0] + 'T23:59:59')
    const dayStart = new Date(props.currentDate); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(props.currentDate); dayEnd.setHours(23, 59, 59, 999)
    return s <= dayEnd && end >= dayStart
  }),
)

const timedEvents = computed(() =>
  props.events.filter(e =>
    !e.allDay && e.startAt && e.endAt
    && e.startAt.split('T')[0] === currentDayStr.value
    && e.startAt.split('T')[0] === e.endAt.split('T')[0],
  ),
)

const windowStart = computed(() => { const s = new Date(props.currentDate); s.setHours(0, 0, 0, 0); return s })
const windowEnd = computed(() => { const e = new Date(props.currentDate); e.setHours(23, 59, 59, 999); return e })

const overlapLayout = computed(() => computeOverlapLayout(timedEvents.value, windowStart.value, windowEnd.value))

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

function eventLeft(id: string) { const l = overlapLayout.value.get(id); return l ? `${(l.col / l.total) * 100}%` : '0%' }
function eventWidth(id: string) { const l = overlapLayout.value.get(id); return l ? `${(1 / l.total) * 100 - 1}%` : '99%' }

// getBoundingClientRect() already accounts for scroll — do NOT add scrollTop.
function getGridMinute(clientY: number): number {
  const rect = gridRef.value!.getBoundingClientRect()
  const relY = clientY - rect.top
  return Math.max(0, Math.min(23 * 60 + 59, Math.round(relY / 15) * 15))
}

// ── Event drag ────────────────────────────────────────────────────────────────

interface EventDrag { eventId: string; origStartAt: string; origEndAt: string; startY: number; snappedMinutes: number }

const eventDrag = ref<EventDrag | null>(null)
const ghostEventId = ref<string | null>(null)
const ghostDeltaMin = ref(0)
const suppressNextClick = ref(false)

function onEventPointerDown(e: PointerEvent, ev: CalendarEvent) {
  e.preventDefault()
  e.stopPropagation()
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  eventDrag.value = { eventId: ev.id, origStartAt: ev.startAt, origEndAt: ev.endAt, startY: e.clientY, snappedMinutes: 0 }
  ghostEventId.value = ev.id
  ghostDeltaMin.value = 0
}

const ghostEvent = computed(() => ghostEventId.value ? props.events.find(e => e.id === ghostEventId.value) ?? null : null)

function ghostTopPct(): number {
  if (!ghostEvent.value) return 0
  const [, t = '00:00:00'] = ghostEvent.value.startAt.split('T')
  const [h, m] = t.split(':').map(Number)
  return Math.max(0, Math.min(23 * 60 + 30, h * 60 + m + ghostDeltaMin.value)) / GRID_HEIGHT * 100
}

// ── Range selection ───────────────────────────────────────────────────────────

interface RangeSelection { startMin: number; endMin: number }
const selection = ref<RangeSelection | null>(null)

const selectionLabel = computed(() => {
  if (!selection.value) return ''
  return `${minutesToTimeLabel(selection.value.startMin)} – ${minutesToTimeLabel(selection.value.endMin)}`
})

function onGridPointerDown(e: PointerEvent) {
  if (eventDrag.value) return
  const rect = gridRef.value?.getBoundingClientRect()
  if (!rect || e.clientX - rect.left < 48) return // ignore gutter clicks
  e.preventDefault()
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  const startMin = getGridMinute(e.clientY)
  selection.value = { startMin, endMin: Math.min(24 * 60, startMin + 30) }
}

function onGridPointerMove(e: PointerEvent) {
  if (eventDrag.value) {
    const rect = gridRef.value?.getBoundingClientRect()
    if (!rect) return
    const pxPerMin = rect.height / GRID_HEIGHT
    const rawDelta = e.clientY - eventDrag.value.startY
    const snapped = Math.round(rawDelta / pxPerMin / 15) * 15
    eventDrag.value.snappedMinutes = snapped
    ghostDeltaMin.value = snapped
    return
  }
  if (selection.value) {
    const endMin = Math.max(selection.value.startMin + 15, Math.min(24 * 60, getGridMinute(e.clientY)))
    selection.value = { ...selection.value, endMin }
  }
}

function onGridPointerUp() {
  if (eventDrag.value) {
    const state = eventDrag.value
    const ev = props.events.find(ev => ev.id === state.eventId)
    const didMove = state.snappedMinutes !== 0
    if (ev && didMove) {
      const origStart = new Date(ev.startAt)
      const dur = new Date(ev.endAt).getTime() - origStart.getTime()
      origStart.setMinutes(origStart.getMinutes() + state.snappedMinutes)
      const totalMin = origStart.getHours() * 60 + origStart.getMinutes()
      if (totalMin < 0) origStart.setHours(0, 0, 0, 0)
      if (totalMin > 23 * 60 + 30) origStart.setHours(23, 30, 0, 0)
      emit('eventMove', ev.id, toLocalISOString(origStart), toLocalISOString(new Date(origStart.getTime() + dur)))
    }
    if (didMove) {
      suppressNextClick.value = true
      setTimeout(() => { suppressNextClick.value = false }, 300)
    }
    eventDrag.value = null
    ghostEventId.value = null
    return
  }
  if (selection.value) {
    const sel = selection.value
    if (sel.endMin > sel.startMin) {
      emit('rangeSelect', buildISOAt(props.currentDate, sel.startMin), buildISOAt(props.currentDate, Math.min(23 * 60 + 59, sel.endMin)))
    }
    selection.value = null
  }
}

function onGridPointerCancel() {
  eventDrag.value = null
  ghostEventId.value = null
  selection.value = null
}

// ── External drop ─────────────────────────────────────────────────────────────

const dragoverMinute = ref<number | null>(null)

function onColumnDragOver(e: DragEvent) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
  dragoverMinute.value = Math.max(0, Math.min(23 * 60, Math.round(e.offsetY / 15) * 15))
}

function onColumnDrop(e: DragEvent) {
  e.preventDefault()
  const data = e.dataTransfer?.getData('application/x-task') || e.dataTransfer?.getData('text/plain')
  dragoverMinute.value = null
  if (!data) return
  const startMin = Math.max(0, Math.min(23 * 60, Math.round(e.offsetY / 15) * 15))
  emit('externalDrop', buildISOAt(props.currentDate, startMin), buildISOAt(props.currentDate, Math.min(24 * 60, startMin + 60)), false, data)
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
        v-for="ev in todayAllDay"
        :key="ev.id"
        :event="ev"
        view="day"
        @click="$emit('eventClick', ev)"
      />
    </div>

    <!-- Scrollable time grid -->
    <div
      ref="scrollRef"
      class="flex-1 overflow-y-auto"
    >
      <div
        ref="gridRef"
        class="relative grid select-none"
        style="grid-template-columns: 48px 1fr; touch-action: none"
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

        <!-- Day column -->
        <div
          class="relative cursor-cell"
          @dragover="onColumnDragOver"
          @dragleave="dragoverMinute = null"
          @drop="onColumnDrop"
        >
          <!-- Grid lines -->
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

          <!-- Events -->
          <div
            v-for="ev in timedEvents"
            :key="ev.id"
            class="absolute px-1 cursor-grab active:cursor-grabbing"
            :style="{
              top: `${eventTopPct(ev)}%`,
              height: `${eventHeightPct(ev)}%`,
              left: eventLeft(ev.id),
              width: eventWidth(ev.id),
              opacity: ghostEventId === ev.id ? 0.25 : 1,
              zIndex: ghostEventId === ev.id ? 0 : 1,
            }"
            @pointerdown="onEventPointerDown($event, ev)"
            @click="!suppressNextClick && $emit('eventClick', ev)"
          >
            <ProtoCalendarEvent
              :event="ev"
              view="day"
              class="h-full pointer-events-none"
            />
          </div>

          <!-- Range selection ghost -->
          <div
            v-if="selection"
            class="absolute pointer-events-none z-10 left-1 right-1 rounded border border-primary/60"
            style="background: color-mix(in srgb, var(--color-primary-500) 15%, transparent)"
            :style="{
              top: `${(selection.startMin / GRID_HEIGHT) * 100}%`,
              height: `${Math.max(15, selection.endMin - selection.startMin) / GRID_HEIGHT * 100}%`,
            }"
          >
            <span
              class="text-xs font-medium px-1 pt-0.5 block leading-tight"
              style="color: var(--color-primary-600)"
            >
              {{ selectionLabel }}
            </span>
          </div>

          <!-- External drop indicator -->
          <div
            v-if="dragoverMinute !== null"
            class="absolute pointer-events-none z-10 left-0 right-0 rounded-r border-l-2 border-primary"
            style="background: color-mix(in srgb, var(--color-primary-500) 12%, transparent)"
            :style="{
              top: `${(dragoverMinute / GRID_HEIGHT) * 100}%`,
              height: `${60 / GRID_HEIGHT * 100}%`,
            }"
          />

          <!-- Event drag ghost -->
          <div
            v-if="ghostEvent && eventDrag"
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
