<script setup lang="ts">
import { ref, computed } from 'vue'
import type * as Y from 'yjs'
import type { CalendarView, CalendarEvent } from '../types/calendar'
import {
  addDays,
  formatMonthTitle,
  formatWeekTitle,
  formatDayTitle,
  toLocalISOString,
} from '../utils/calendarLayout'
import { useProtoCalendar } from '../composables/useProtoCalendar'

const props = defineProps<{
  docKey?: string
  namespace?: string
  existingDoc?: Y.Doc
  initialView?: CalendarView
  initialDate?: string
  disableSync?: boolean
}>()

const currentView = ref<CalendarView>(props.initialView ?? 'month')
const currentDate = ref<Date>(
  props.initialDate ? new Date(props.initialDate) : new Date(),
)

const { events, addEvent, updateEvent, removeEvent, moveEvent, isReady } = useProtoCalendar({
  docKey: props.docKey,
  namespace: props.namespace,
  existingDoc: props.existingDoc,
  disableSync: props.disableSync,
})

// ── Header title ──────────────────────────────────────────────────────────────

const viewTitle = computed(() => {
  if (currentView.value === 'month') return formatMonthTitle(currentDate.value)
  if (currentView.value === 'week') return formatWeekTitle(currentDate.value)
  return formatDayTitle(currentDate.value)
})

// ── Navigation ────────────────────────────────────────────────────────────────

function navigatePrev() {
  const d = new Date(currentDate.value)
  if (currentView.value === 'month') {
    d.setMonth(d.getMonth() - 1)
  }
  else if (currentView.value === 'week') {
    d.setDate(d.getDate() - 7)
  }
  else {
    d.setDate(d.getDate() - 1)
  }
  currentDate.value = d
}

function navigateNext() {
  const d = new Date(currentDate.value)
  if (currentView.value === 'month') {
    d.setMonth(d.getMonth() + 1)
  }
  else if (currentView.value === 'week') {
    d.setDate(d.getDate() + 7)
  }
  else {
    d.setDate(d.getDate() + 1)
  }
  currentDate.value = d
}

function goToToday() {
  currentDate.value = new Date()
}

// ── Modal state ───────────────────────────────────────────────────────────────

const isModalOpen = ref(false)
const selectedEvent = ref<CalendarEvent | null>(null)
const newEventDefaults = ref<Partial<CalendarEvent>>({})

function onDayClick(date: Date, hour = 9) {
  const start = new Date(date)
  start.setHours(hour, 0, 0, 0)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  newEventDefaults.value = {
    startAt: toLocalISOString(start),
    endAt: toLocalISOString(end),
  }
  selectedEvent.value = null
  isModalOpen.value = true
}

function onEventClick(event: CalendarEvent) {
  selectedEvent.value = event
  newEventDefaults.value = {}
  isModalOpen.value = true
}

function onEventMove(id: string, newStartAt: string, newEndAt: string) {
  moveEvent(id, newStartAt, newEndAt)
}

function onModalSave(event: CalendarEvent) {
  if (selectedEvent.value?.id) {
    updateEvent(event.id, event)
  }
  else {
    const { id: _id, ...rest } = event
    addEvent(rest)
  }
}

function onModalDelete(event: CalendarEvent) {
  removeEvent(event.id)
}

// Navigate to a day when "+N more" is clicked in month view
function onMonthDayClick(date: Date) {
  currentDate.value = date
  currentView.value = 'day'
}
</script>

<template>
  <ClientOnly>
    <div class="flex flex-col h-full overflow-hidden">
      <!-- Calendar header -->
      <div class="flex items-center gap-2 px-4 py-3 border-b border-default shrink-0">
        <!-- Prev/Next/Today -->
        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-chevron-left"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="navigatePrev"
          />
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            @click="goToToday"
          >
            Today
          </UButton>
          <UButton
            icon="i-lucide-chevron-right"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="navigateNext"
          />
        </div>

        <!-- Title -->
        <h2 class="flex-1 text-base font-semibold text-highlighted">
          {{ viewTitle }}
        </h2>

        <!-- View toggle -->
        <div class="flex items-center gap-1">
          <UButton
            v-for="view in (['month', 'week', 'day'] as CalendarView[])"
            :key="view"
            :variant="currentView === view ? 'solid' : 'ghost'"
            :color="currentView === view ? 'primary' : 'neutral'"
            size="sm"
            class="capitalize"
            @click="currentView = view"
          >
            {{ view }}
          </UButton>
        </div>

        <!-- Add event button -->
        <UButton
          icon="i-lucide-plus"
          size="sm"
          @click="onDayClick(currentDate)"
        >
          Add Event
        </UButton>
      </div>

      <!-- Loading state -->
      <div
        v-if="!isReady"
        class="flex-1 animate-pulse bg-muted/30 m-2 rounded"
      />

      <!-- Calendar views -->
      <template v-else>
        <ProtoCalendarMonth
          v-if="currentView === 'month'"
          :events="events"
          :current-date="currentDate"
          class="flex-1 overflow-hidden"
          @day-click="onMonthDayClick"
          @event-click="onEventClick"
          @event-move="onEventMove"
        />
        <ProtoCalendarWeek
          v-else-if="currentView === 'week'"
          :events="events"
          :current-date="currentDate"
          class="flex-1 overflow-hidden"
          @day-click="(date, hour) => onDayClick(date, hour)"
          @event-click="onEventClick"
          @event-move="onEventMove"
        />
        <ProtoCalendarDay
          v-else
          :events="events"
          :current-date="currentDate"
          class="flex-1 overflow-hidden"
          @day-click="(date, hour) => onDayClick(date, hour)"
          @event-click="onEventClick"
          @event-move="onEventMove"
        />
      </template>
    </div>

    <!-- Event modal -->
    <ProtoCalendarEventModal
      v-model:open="isModalOpen"
      :event="selectedEvent"
      :defaults="newEventDefaults"
      @save="onModalSave"
      @delete="onModalDelete"
    />

    <template #fallback>
      <div class="flex-1 animate-pulse bg-muted rounded m-4" />
    </template>
  </ClientOnly>
</template>
