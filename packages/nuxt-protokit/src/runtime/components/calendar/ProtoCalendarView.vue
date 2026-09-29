<script setup lang="ts">
// <ProtoCalendarView> — day / week / infinite month views with drag-to-create, move, resize and an inline
// event form. Built from the Nuxt UI calendar template (MIT, github.com/nuxt-ui-templates/calendar).
//
// The calendar owns no persistence. `events` comes in, and every change goes back out as `create` /
// `update` / `remove`; the change is shown straight away and held until the parent hands back a new
// `events` array. `view`, `date` and `hidden-calendars` are models, bind them to keep them in the URL
// or a cookie, or leave them and the calendar keeps its own.
import type { CalendarDate } from '@internationalized/date'
import type { TabsItem } from '@nuxt/ui'
import { computed, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import type {
  CalendarEvent, CalendarExternalDrop, CalendarSource, CalendarView, DateRange, WeekStartsOn,
} from '../../calendar/types'
import { provideCalendarContext } from '../../calendar/context'
import { todayDate } from '../../calendar/dates'
import List from './ProtoCalendarList.vue'
import Mini from './ProtoCalendarMini.vue'
import MonthView from './ProtoCalendarMonthView.vue'
import NewEventMenu from './ProtoCalendarNewEventMenu.vue'
import WeekView from './ProtoCalendarWeekView.vue'

const props = withDefaults(defineProps<{
  events?: CalendarEvent[]
  /** Sources events belong to via `calendarId`. They colour the events and fill the sidebar list. */
  calendars?: CalendarSource[]
  weekStartsOn?: WeekStartsOn
  locale?: string
  /** Which views the switcher offers. */
  views?: CalendarView[]
  /** Drag to move and resize. Off, the calendar only displays and emits `event-click`. */
  editable?: boolean
  /** Draw new events on the grid, the `+` menu and `n`. Needs `editable`. */
  creatable?: boolean
  /** Clicking an editable event opens the inline form. Off, the click is only `event-click`. */
  popover?: boolean
  /** Accept HTML5 drops from outside (see `external-drop`). */
  droppable?: boolean
  loading?: boolean
  toolbar?: boolean
  /** The mini month and the calendar list, from `lg` up. */
  sidebar?: boolean
  /** The "Movie at 7pm on Friday" input in the new event menu. */
  quickEvents?: boolean
  /** t / d / w / m / n / ← / → while the page has focus. Off by default, they are page-wide. */
  shortcuts?: boolean
}>(), {
  events: () => [],
  calendars: () => [],
  weekStartsOn: 1,
  locale: 'en-US',
  views: () => ['day', 'week', 'month'],
  editable: true,
  creatable: true,
  popover: true,
  droppable: false,
  loading: false,
  toolbar: true,
  sidebar: false,
  quickEvents: true,
  shortcuts: false,
})

const emit = defineEmits<{
  'create': [event: CalendarEvent]
  'update': [event: CalendarEvent]
  'remove': [id: string]
  'event-click': [event: CalendarEvent]
  'external-drop': [drop: CalendarExternalDrop]
  /** The range on screen, and in the month view every 6-week chunk scrolled near. */
  'range-change': [range: DateRange]
}>()

const view = defineModel<CalendarView>('view', { default: 'week' })
const date = defineModel<CalendarDate>('date', { default: () => todayDate() })
const hiddenCalendars = defineModel<string[]>('hiddenCalendars', { default: () => [] })

const context = provideCalendarContext({
  events: () => props.events,
  calendars: () => props.calendars,
  hiddenCalendars,
  view,
  date,
  weekStartsOn: () => props.weekStartsOn,
  locale: () => props.locale,
  editable: () => props.editable,
  creatable: () => props.creatable,
  popover: () => props.popover,
  droppable: () => props.droppable,
  loading: () => props.loading,
  emit: {
    create: event => emit('create', event),
    update: event => emit('update', event),
    remove: id => emit('remove', id),
    eventClick: event => emit('event-click', event),
    externalDrop: drop => emit('external-drop', drop),
    rangeChange: range => emit('range-change', range),
  },
})

const { title, prevDate, nextDate, setDate, setView, draft, editingId, canCreate, createAtAnchor } = context

watch(context.range, range => emit('range-change', range), { immediate: true })

const VIEW_LABELS: Record<CalendarView, string> = { day: 'Day', week: 'Week', month: 'Month' }

const viewItems = computed<TabsItem[]>(() => props.views.map(value => ({ label: VIEW_LABELS[value], value })))

function goToday() {
  setDate(todayDate())
}

// Plain keys, so they stand down while anything is being typed. The form popover also holds the focus on
// a switch, a select or a date segment, and a key that navigates from there would take the grid out
// from under whatever is being written, so they wait for the draft and the form to close too. A
// keydown listener rather than Nuxt UI's `defineShortcuts`: the kit uses Nuxt UI's components and
// nothing of its runtime, which keeps it working across @nuxt/ui majors
const SHORTCUTS: Record<string, () => void> = {
  t: goToday,
  d: () => props.views.includes('day') && setView('day'),
  w: () => props.views.includes('week') && setView('week'),
  m: () => props.views.includes('month') && setView('month'),
  n: () => createAtAnchor(),
  ArrowLeft: () => setDate(prevDate.value),
  ArrowRight: () => setDate(nextDate.value),
}

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null

  return !!element && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName))
}

useEventListener('keydown', (event: KeyboardEvent) => {
  const handler = SHORTCUTS[event.key]
  if (!handler || !props.shortcuts || event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) {
    return
  }
  if (isTyping(event.target) || draft.value || editingId.value) {
    return
  }

  event.preventDefault()
  handler()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden bg-default">
    <header
      v-if="toolbar"
      class="flex shrink-0 items-center gap-2 border-b border-default px-4 py-2.5 sm:gap-4"
    >
      <slot name="toolbar-start" />

      <h2 class="flex min-w-0 flex-1 items-baseline gap-1.5 text-lg tracking-tight sm:text-xl">
        <span class="truncate font-bold text-highlighted">{{ title.months }}</span>
        <span class="hidden font-normal text-muted sm:inline">{{ title.year }}</span>
      </h2>

      <!-- Down to the initial below `sm`, where the toolbar cannot spare the width for the labels -->
      <UTabs
        v-if="viewItems.length > 1"
        :items="viewItems"
        :content="false"
        :model-value="view"
        color="neutral"
        size="sm"
        :ui="{ trigger: 'p-1 lg:p-1.5' }"
        @update:model-value="setView($event as CalendarView)"
      >
        <template #default="{ item }">
          <span class="sm:hidden">{{ item.label?.charAt(0) }}</span>
          <span class="hidden sm:inline">{{ item.label }}</span>
        </template>
      </UTabs>

      <div class="flex items-center gap-2">
        <slot name="toolbar-end" />

        <!-- The props on each button rather than a UTheme around them: UTheme only takes `props` in Nuxt UI
          releases after 4.5, which the kit still supports -->
        <div class="flex items-center gap-1">
          <UTooltip
            text="Previous"
            :kbds="shortcuts ? ['arrowleft'] : undefined"
          >
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              icon="i-lucide-chevron-left"
              aria-label="Previous"
              class="rounded-full"
              @click="setDate(prevDate)"
            />
          </UTooltip>
          <UTooltip
            text="Today"
            :kbds="shortcuts ? ['t'] : undefined"
          >
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              label="Today"
              class="hidden rounded-full sm:inline-flex"
              @click="goToday"
            />
          </UTooltip>
          <UTooltip
            text="Next"
            :kbds="shortcuts ? ['arrowright'] : undefined"
          >
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              icon="i-lucide-chevron-right"
              aria-label="Next"
              class="rounded-full"
              @click="setDate(nextDate)"
            />
          </UTooltip>
        </div>

        <NewEventMenu
          v-if="canCreate"
          :quick="quickEvents"
        />
      </div>
    </header>

    <div class="flex min-h-0 flex-1">
      <aside
        v-if="sidebar"
        class="hidden w-64 shrink-0 flex-col gap-4 overflow-y-auto border-e border-default p-3 lg:flex"
      >
        <slot name="sidebar-start" />
        <Mini />
        <List v-if="calendars.length" />
        <slot name="sidebar-end" />
      </aside>

      <div class="relative flex min-w-0 flex-1 flex-col">
        <MonthView v-if="view === 'month'" />
        <WeekView v-else />
      </div>
    </div>
  </div>
</template>
