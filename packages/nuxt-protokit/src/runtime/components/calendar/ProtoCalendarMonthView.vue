<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { computed, nextTick, onUnmounted, ref, shallowRef, unref, useTemplateRef, watch } from 'vue'
import { refAutoReset, useEventListener } from '@vueuse/core'
import { addDays, addWeeks, differenceInCalendarWeeks, startOfWeek } from 'date-fns'
import { MONTH_FETCH_WEEKS, monthRange, toCalendarDate, toDate } from '../../calendar/dates'
import { useCalendarContext } from '../../calendar/context'
import MonthWeek from './ProtoCalendarMonthWeek.vue'

// ±5 years of week rows, virtualized so only the visible ones render
const WEEKS_AROUND = 260
const ROW_HEIGHT = 140
const CHUNK_WEEKS = 6
// Height of a month label, spacing the sticky stack in the overlay
const LABEL_HEIGHT = 32
// How far a riding label sits above the top of its week row
const LABEL_LIFT = 12
// The scroll area starts at the top of the view so events show through the blurred weekday bar, the
// grid rests under it via the virtualizer's `paddingStart`
const WEEKDAY_HEIGHT = 40

const { date, weekStartsOn, format, visibleMonth, draft, pendingScroll, setDate, reportRange } = useCalendarContext()

const scrollElement = shallowRef<Element | null>(null)

const firstWeek = computed(() => addWeeks(startOfWeek(new Date(), { weekStartsOn: weekStartsOn.value }), -WEEKS_AROUND))
const weeks = computed(() => Array.from({ length: WEEKS_AROUND * 2 + 1 }, (_, index) => addWeeks(firstWeek.value, index)))
const weekdays = computed(() => Array.from({ length: 7 }, (_, index) => format.value.weekday(addDays(firstWeek.value, index))))

function indexOf(day: Date): number {
  return Math.min(weeks.value.length - 1, Math.max(0, differenceInCalendarWeeks(day, firstWeek.value, { weekStartsOn: weekStartsOn.value })))
}

function monthStart(month: CalendarDate): Date {
  return monthRange(month, weekStartsOn.value).start
}

// The virtualizer renders from this offset on its very first pass, so the list mounts on the anchor
// month instead of mounting five years back and throwing those rows away on the scroll below
function initialOffset(): number {
  return indexOf(monthStart(date.value)) * ROW_HEIGHT
}

// SSR fallback: the anchor month as a static grid, swapped for the virtualized list once mounted
const fallbackWeeks = computed(() => {
  const start = monthStart(date.value)

  return Array.from({ length: MONTH_FETCH_WEEKS }, (_, index) => addWeeks(start, index))
})

const scrollArea = useTemplateRef('scrollArea')

// The exposed `virtualizer` is a Ref, `unref` gives the TanStack instance
function getVirtualizer() {
  return unref((scrollArea.value as { virtualizer?: unknown } | null)?.virtualizer) as {
    getVirtualItems: () => { index: number }[]
    scrollToIndex: (index: number, options?: { align?: 'start' | 'center', behavior?: 'auto' | 'smooth' }) => void
    scrollElement: Element | null
  } | undefined
}

function visibleRange(): { first: number, last: number } | null {
  const items = getVirtualItems()
  if (!items.length) {
    return null
  }

  return { first: items[0]!.index, last: items[items.length - 1]!.index }
}

function getVirtualItems() {
  return getVirtualizer()?.getVirtualItems() ?? []
}

// Report the aligned 6-week chunks around the viewport, so a parent loading events by range can fetch
// ahead of the scroll. Deduplicated by the context, already reported chunks are free
function loadVisibleChunks() {
  const visible = visibleRange()
  if (!visible) {
    return
  }

  const first = Math.max(0, Math.floor((visible.first - CHUNK_WEEKS) / CHUNK_WEEKS))
  const last = Math.min(Math.floor((weeks.value.length - 1) / CHUNK_WEEKS), Math.floor((visible.last + CHUNK_WEEKS) / CHUNK_WEEKS))

  for (let chunk = first; chunk <= last; chunk++) {
    const start = addWeeks(firstWeek.value, chunk * CHUNK_WEEKS)

    reportRange({ start, end: addWeeks(start, CHUNK_WEEKS) })
  }
}

// The `+` button can draw on a week the virtualizer has not mounted, and a ghost that never renders
// cannot scroll itself into view
watch(pendingScroll, (pending) => {
  if (!pending || !draft.value) {
    return
  }

  getVirtualizer()?.scrollToIndex(indexOf(draft.value.start), { align: 'center', behavior: 'smooth' })
  loadVisibleChunks()
})

// Jumps dock the week containing the 1st at the top, so the target month's label lands on the top
// edge like Apple Calendar
function scrollToMonth(target: CalendarDate, options?: { smooth?: boolean }) {
  getVirtualizer()?.scrollToIndex(indexOf(monthStart(target)), {
    align: 'start',
    behavior: options?.smooth ? 'smooth' : 'auto',
  })
}

// All of the below runs on every scroll frame, so the date math each piece repeats for the same month
// is memoized on a plain month number: building a `CalendarDate` and converting it back to a `Date`
// are the expensive parts
function monthKey(month: CalendarDate): number {
  return month.year * 12 + month.month
}

// The docked month is the one whose label most recently crossed the top: the month of the last day of
// the top visible week
const dockedMonths = new Map<number, CalendarDate>()

function dockedMonth(): CalendarDate | null {
  const offset = scrollElement.value?.scrollTop

  if (offset == null) {
    return null
  }

  const top = Math.min(weeks.value.length - 1, Math.max(0, Math.floor(offset / ROW_HEIGHT)))

  let month = dockedMonths.get(top)
  if (!month) {
    month = toCalendarDate(addDays(weeks.value[top]!, 6)).set({ day: 1 })
    dockedMonths.set(top, month)
  }

  return month
}

// One real label per month, in an overlay over the grid: it rides the week row containing the 1st,
// docks at the top edge and is pushed out through the top by the next month's incoming label, like
// Apple Calendar
const labels = shallowRef<{ key: number, month: string, year: string, y: number }[]>([])

// They would sit over the day numbers and the events for good, so they only show while the list moves
// and fade out once it settles. The toolbar title carries the docked month the rest of the time
const labelsVisible = refAutoReset(false, 600)

// The list scrolls itself into place on arrival, that one should not wake them the way a real scroll
// does
let labelsAwake = false

const labelOffsets = new Map<number, number>()

function labelOffset(month: CalendarDate): number {
  const key = monthKey(month)

  let offset = labelOffsets.get(key)
  if (offset === undefined) {
    offset = indexOf(monthStart(month)) * ROW_HEIGHT
    labelOffsets.set(key, offset)
  }

  return offset
}

const labelTexts = new Map<number, { month: string, year: string }>()

function labelText(month: CalendarDate): { month: string, year: string } {
  const key = monthKey(month)

  let text = labelTexts.get(key)
  if (!text) {
    text = { month: format.value.month(toDate(month)), year: String(month.year) }
    labelTexts.set(key, text)
  }

  return text
}

// The memos are keyed on positions that depend on where the weeks start
watch([weekStartsOn, format], () => {
  dockedMonths.clear()
  labelOffsets.clear()
  labelTexts.clear()
})

let viewportHeight = 0

function updateLabels(docked: CalendarDate) {
  const offset = scrollElement.value?.scrollTop

  if (offset == null) {
    return
  }

  // The docked month plus every month whose label row is in the viewport
  const months = [docked]
  while (months.length < 4) {
    const next = months[months.length - 1]!.add({ months: 1 })

    if (labelOffset(next) > offset + viewportHeight) {
      break
    }

    months.push(next)
  }

  // Each label rides its row, then leads the scroll over the last stretch so it reaches the docked spot
  // (y 0, the overlay top) exactly as its row passes under the weekday bar, where it rests until pushed
  const positions = months.map((month) => {
    const distance = labelOffset(month) - offset

    return Math.max((distance >= 0 ? distance : distance * 2) - LABEL_LIFT, 0)
  })

  for (let index = positions.length - 2; index >= 0; index--) {
    positions[index] = Math.min(positions[index]!, positions[index + 1]! - LABEL_HEIGHT)
  }

  labels.value = months.map((month, index) => ({
    key: monthKey(month),
    ...labelText(month),
    y: positions[index]!,
  }))
}

function update() {
  const docked = dockedMonth()

  if (!docked) {
    return
  }

  if (!visibleMonth.value || docked.compare(visibleMonth.value) !== 0) {
    visibleMonth.value = docked
  }

  updateLabels(docked)
}

// `@scroll` on the scroll area only fires when scrolling starts and stops, the native event drives the
// per-pixel docking and label positions
useEventListener(scrollElement, 'scroll', () => {
  update()
  loadVisibleChunks()

  if (labelsAwake) {
    labelsVisible.value = true
  }
}, { passive: true })

// Measured off the scroll path, `clientHeight` would otherwise be read back right after the
// virtualizer writes the row styles and force a layout
function measure() {
  viewportHeight = scrollElement.value?.clientHeight ?? 0
}

useEventListener('resize', () => {
  measure()
  update()
})

function applyInitialPosition(): boolean {
  const element = getVirtualizer()?.scrollElement

  if (!element) {
    return false
  }

  scrollElement.value = element
  measure()
  scrollToMonth(date.value)

  // A background tab cannot scroll, so the position has to be retried until it actually applies
  if (element.scrollTop === 0) {
    return false
  }

  update()
  loadVisibleChunks()

  // The scroll above lands its event in the next rendering step, this runs after it
  requestAnimationFrame(() => {
    labelsAwake = true
  })

  return true
}

// The scroll area mounts a tick after this component (it sits behind ClientOnly), so the position
// lands in the same flush that swaps it in
watch(scrollArea, async () => {
  if (applyInitialPosition()) {
    return
  }

  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 50))

    if (applyInitialPosition()) {
      return
    }
  }
}, { flush: 'post', once: true })

// Scrolling owns the date: on settle, the docked month becomes the calendar's date so the mini
// calendar and a parent's `v-model:date` follow along
const syncing = ref(false)

async function syncDate() {
  const target = dockedMonth()

  if (!target || (target.year === date.value.year && target.month === date.value.month)) {
    return
  }

  syncing.value = true
  setDate(target)
  await nextTick()
  syncing.value = false
}

function onScroll(isScrolling: boolean) {
  if (!isScrolling) {
    syncDate()
  }
}

// External jumps (mini calendar, prev/next, today) scroll the list instead
watch(() => date.value.toString(), () => {
  if (syncing.value) {
    return
  }

  // Already docked on this month (e.g. the date caught up with the scroll), moving would yank the
  // scroll position
  const docked = dockedMonth()
  if (docked && docked.year === date.value.year && docked.month === date.value.month) {
    return
  }

  const visible = visibleRange()
  const target = indexOf(monthStart(date.value))
  const smooth = !!visible && Math.abs(target - Math.round((visible.first + visible.last) / 2)) <= 12

  scrollToMonth(date.value, { smooth })
  loadVisibleChunks()
})

onUnmounted(() => {
  visibleMonth.value = null
})
</script>

<template>
  <div class="relative flex-1 flex flex-col min-h-0">
    <ClientOnly>
      <!-- Snapped on the week rows so the grid always settles flush under the weekday bar, the way the
        docked labels assume. `scrollPaddingStart` is the virtualizer's own, it only offsets
        `scrollToIndex`, the snap positions need the CSS one. Proximity, not mandatory: rows mount and
        unmount as the list virtualizes and a mandatory scroller re-snaps on every content change -->
      <UScrollArea
        ref="scrollArea"
        :items="weeks"
        :virtualize="{ estimateSize: ROW_HEIGHT, skipMeasurement: true, overscan: 4, paddingStart: WEEKDAY_HEIGHT, scrollPaddingStart: WEEKDAY_HEIGHT, initialOffset }"
        :ui="{ item: 'snap-start' }"
        :style="{ scrollPaddingTop: `${WEEKDAY_HEIGHT}px` }"
        class="flex-1 snap-y snap-proximity [scrollbar-gutter:stable]"
        @scroll="onScroll"
      >
        <template #default="{ item }">
          <MonthWeek
            :week-start="item"
            :style="{ height: `${ROW_HEIGHT}px` }"
          />
        </template>
      </UScrollArea>

      <template #fallback>
        <div
          class="flex-1 overflow-hidden [scrollbar-gutter:stable]"
          :style="{ paddingTop: `${WEEKDAY_HEIGHT}px` }"
        >
          <MonthWeek
            v-for="week in fallbackWeeks"
            :key="week.getTime()"
            :week-start="week"
            :style="{ height: `${ROW_HEIGHT}px` }"
          />
        </div>
      </template>
    </ClientOnly>

    <!-- Its columns are the week rows': the grid scrolls and is a scrollbar narrower, so the band
      reserves that same gutter, or the weekdays drift right of the days below them -->
    <div class="absolute top-0 inset-x-0 z-30 h-10 grid grid-cols-7 backdrop-blur-xl bg-default/75 border-b border-default overflow-hidden [scrollbar-gutter:stable]">
      <span
        v-for="(weekday, index) in weekdays"
        :key="weekday"
        class="flex items-center justify-end pe-2 text-sm text-muted border-default"
        :class="index !== 0 && 'border-s'"
      >
        {{ weekday }}
      </span>
    </div>

    <!-- Month labels, from under the weekday bar (the overlay top, also its clip line) down over the
      grid. Quick to come back once the list moves, slower on the way out -->
    <div
      class="absolute inset-x-0 bottom-0 z-20 overflow-hidden pointer-events-none transition-opacity"
      :class="labelsVisible ? 'opacity-100 duration-150' : 'opacity-0 duration-300'"
      :style="{ top: `${WEEKDAY_HEIGHT}px` }"
    >
      <div
        v-for="label in labels"
        :key="label.key"
        class="absolute top-0 inset-s-4 flex items-center gap-1.5 h-8 px-2 rounded-md text-xl sm:text-2xl tracking-tight backdrop-blur-md bg-default/60 will-change-[translate]"
        :style="{ translate: `0 ${label.y}px` }"
      >
        <span class="font-bold text-highlighted">{{ label.month }}</span>
        <span class="font-normal text-muted hidden sm:inline">{{ label.year }}</span>
      </div>
    </div>
  </div>
</template>
