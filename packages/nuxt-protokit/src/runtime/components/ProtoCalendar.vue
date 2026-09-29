<script setup lang="ts">
// <ProtoCalendar> — <ProtoCalendarView> bound to a Y.js document through `useProtoCalendar`, so it
// persists to IndexedDB and syncs across tabs with no wiring. Any other <ProtoCalendarView> prop or
// listener (`week-starts-on`, `sidebar`, `@event-click`, …) passes straight through.
//
// The store keeps its own event shape (all-day `endAt` is the last day); `fromStoredEvent` and
// `toStoredPatch` convert both ways, so documents written by earlier versions still open.
import type * as Y from 'yjs'
import { parseDate } from '@internationalized/date'
import type { CalendarDate } from '@internationalized/date'
import { computed, ref, shallowRef } from 'vue'
import type { CalendarEvent, CalendarView } from '../calendar/types'
import { fromStoredEvent, toStoredPatch } from '../calendar/stored'
import { todayDate } from '../calendar/dates'
import { CALENDAR_EVENT_DEFAULTS } from '../types/calendar'
import { useProtoCalendar } from '../composables/useProtoCalendar'
import ProtoCalendarView from './calendar/ProtoCalendarView.vue'

const props = withDefaults(defineProps<{
  docKey?: string
  namespace?: string
  existingDoc?: Y.Doc
  initialView?: CalendarView
  /** `YYYY-MM-DD` (a longer ISO string is cut to its date). */
  initialDate?: string
  disableSync?: boolean
}>(), {
  initialView: 'month',
})

const { events: stored, addEvent, updateEvent, removeEvent, isReady } = useProtoCalendar({
  docKey: props.docKey,
  namespace: props.namespace,
  existingDoc: props.existingDoc,
  disableSync: props.disableSync,
})

function startingDate(): CalendarDate {
  try {
    return props.initialDate ? parseDate(props.initialDate.slice(0, 10)) : todayDate()
  }
  catch {
    return todayDate()
  }
}

const view = ref<CalendarView>(props.initialView)
// Shallow: a reactive proxy would break `CalendarDate`'s private fields
const date = shallowRef<CalendarDate>(startingDate())

const events = computed(() => stored.value.map(fromStoredEvent))

function onCreate(event: CalendarEvent) {
  addEvent({ ...CALENDAR_EVENT_DEFAULTS, ...toStoredPatch(event) })
}

function onUpdate(event: CalendarEvent) {
  updateEvent(event.id, toStoredPatch(event))
}
</script>

<template>
  <!-- The document lives in IndexedDB, so there is nothing to render on the server; until it has loaded, the
    view shows its placeholders rather than an empty calendar -->
  <ClientOnly>
    <ProtoCalendarView
      v-model:view="view"
      v-model:date="date"
      :events="events"
      :loading="!isReady"
      @create="onCreate"
      @update="onUpdate"
      @remove="removeEvent"
    />

    <template #fallback>
      <div class="flex-1 h-full animate-pulse bg-muted rounded m-4" />
    </template>
  </ClientOnly>
</template>
