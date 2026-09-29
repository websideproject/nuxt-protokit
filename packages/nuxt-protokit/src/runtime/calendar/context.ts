// The state one `<ProtoCalendarView>` shares with everything inside it.
//
// The Nuxt UI calendar template (MIT) keeps this as five app-wide singletons: `useCalendar` reading
// the route, `useCalendarEvents` fetching `/api/events` with an offline queue, and the draft, editor
// and move gestures on top. As a component kit none of that can be global (two calendars on a page
// would share one draft), so the root creates it once per instance and provides it. The route becomes
// the `view`/`date` models, the fetch becomes the `events` prop, and every mutation becomes an emit.
import type { CalendarDate } from '@internationalized/date'
import type { InjectionKey, Ref } from 'vue'
import { computed, inject, nextTick, onMounted, onUnmounted, provide, ref, shallowRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { addDays, addMinutes, differenceInCalendarDays, startOfDay } from 'date-fns'
import type {
  CalendarColor, CalendarEvent, CalendarExternalDrop, CalendarSource, CalendarView, DateRange, WeekStartsOn,
} from './types'
import type { RangeTitle } from './dates'
import {
  calendarFormatters, dateAtPoint, dayKey, isoDate, rangeFor, toCalendarDate, toDate, toLocalISO,
} from './dates'
import { DRAFT_EVENT_ID, DRAG_THRESHOLD, SNAP_MINUTES, minutesInColumn } from './layout'
import type { QuickEvent } from './quickEvent'

export interface EventDraft {
  start: Date
  end: Date
  allDay: boolean
  title: string
  calendarId?: string
  color?: CalendarColor
  description: string
  location: string
}

// Where a gesture started, and what it should draw there. The month grid has no time axis, so a
// double click on it falls back to a fixed hour while its drag draws the same all-day span the week
// view's top row does
export interface GridTarget {
  kind: 'timed' | 'allDay' | 'month'
  day: Date
}

export interface CalendarEmitters {
  create: (event: CalendarEvent) => void
  update: (event: CalendarEvent) => void
  remove: (id: string) => void
  eventClick: (event: CalendarEvent) => void
  externalDrop: (drop: CalendarExternalDrop) => void
  rangeChange: (range: DateRange) => void
}

export interface CalendarContextOptions {
  events: () => CalendarEvent[]
  calendars: () => CalendarSource[]
  hiddenCalendars: Ref<string[]>
  view: Ref<CalendarView>
  date: Ref<CalendarDate>
  weekStartsOn: () => WeekStartsOn
  locale: () => string
  editable: () => boolean
  creatable: () => boolean
  popover: () => boolean
  droppable: () => boolean
  loading: () => boolean
  emit: CalendarEmitters
}

// What a double click and the `+` button draw on a grid with no time under the pointer
const DEFAULT_HOUR = 9
// What an unnamed draft is called, on the ghost and once it is saved
export const DEFAULT_TITLE = 'New Event'

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createCalendarContext(options: CalendarContextOptions) {
  const { view, date, hiddenCalendars, emit } = options

  // ── View and date ─────────────────────────────────────────────────────────────────────────────
  const weekStartsOn = computed(options.weekStartsOn)
  const format = computed(() => calendarFormatters(options.locale()))
  const range = computed<DateRange>(() => rangeFor(view.value, date.value, weekStartsOn.value))
  const loading = computed(options.loading)

  // The month docked at the top of the month view scroll viewport, kept in sync live while scrolling
  // so the toolbar title follows along
  const visibleMonth = shallowRef<CalendarDate | null>(null)

  const title = computed<RangeTitle>(() => {
    if (view.value === 'month') {
      const focus = visibleMonth.value ?? date.value

      return { months: format.value.month(toDate(focus)), year: String(focus.year) }
    }

    return format.value.rangeTitle(range.value)
  })

  // The event form stands beside the event it belongs to. The day view has a single column the width
  // of the grid, so there is no beside to stand in
  const formSide = computed<'bottom' | 'right'>(() => view.value === 'day' ? 'bottom' : 'right')

  const step = computed(() => view.value === 'month' ? { months: 1 } : { days: view.value === 'day' ? 1 : 7 })
  const prevDate = computed(() => date.value.subtract(step.value))
  const nextDate = computed(() => date.value.add(step.value))

  function setDate(value: CalendarDate) {
    if (value.compare(date.value) !== 0) {
      date.value = value
    }
  }

  function setView(value: CalendarView, at?: CalendarDate) {
    if (at) {
      setDate(at)
    }
    view.value = value
  }

  // ── Events ────────────────────────────────────────────────────────────────────────────────────
  const calendars = computed(options.calendars)

  // Changes are shown the moment they are made and emitted for the parent to persist. The overlay
  // holds them until the parent hands back a new `events` array, so a drop does not snap back to where
  // it came from for the length of a request. `null` is a removal
  const overlay = shallowRef(new Map<string, CalendarEvent | null>())

  watch(options.events, () => {
    if (overlay.value.size) {
      overlay.value = new Map()
    }
  })

  function patch(id: string, value: CalendarEvent | null) {
    const next = new Map(overlay.value)
    next.set(id, value)
    overlay.value = next
  }

  const events = computed<CalendarEvent[]>(() => {
    let merged = options.events()

    if (overlay.value.size) {
      const byId = new Map(merged.map(event => [event.id, event]))
      for (const [id, value] of overlay.value) {
        if (value) {
          byId.set(id, value)
        }
        else {
          byId.delete(id)
        }
      }
      merged = [...byId.values()]
    }

    const hidden = hiddenCalendars.value

    return hidden.length ? merged.filter(event => !event.calendarId || !hidden.includes(event.calendarId)) : merged
  })

  // Every view renders a handful of days and would otherwise scan the whole pool once per day, which
  // the month view makes expensive: a couple of dozen week rows stay mounted and each rescans it.
  // Bucketing once per change turns those scans into seven lookups
  const eventsByDay = computed(() => {
    const buckets = new Map<string, CalendarEvent[]>()

    for (const event of events.value) {
      const end = new Date(event.end)

      // Ranges are [start, end), so an event ending at midnight stops on the previous day and one with
      // no duration still covers its own
      let day = startOfDay(new Date(event.start))
      do {
        const key = dayKey(day)
        const bucket = buckets.get(key)

        if (bucket) {
          bucket.push(event)
        }
        else {
          buckets.set(key, [event])
        }

        day = addDays(day, 1)
      } while (day < end)
    }

    return buckets
  })

  function eventsForDay(day: Date): CalendarEvent[] {
    return eventsByDay.value.get(dayKey(day)) ?? []
  }

  // Multi-day events land in every bucket they cover, so a span of days has to deduplicate them
  function eventsForDays(days: Date[]): CalendarEvent[] {
    const seen = new Set<string>()

    return days.flatMap(day => eventsForDay(day).filter((event) => {
      if (seen.has(event.id)) {
        return false
      }

      seen.add(event.id)

      return true
    }))
  }

  function colorOf(event: Pick<CalendarEvent, 'color' | 'calendarId'>): CalendarColor {
    return event.color ?? calendars.value.find(calendar => calendar.id === event.calendarId)?.color ?? 'primary'
  }

  function canEdit(event: CalendarEvent): boolean {
    return options.editable() && event.editable !== false
  }

  // Drawing new events on the grid, the `+` menu and `n`
  const canCreate = computed(() => options.editable() && options.creatable())

  // Whether pointing at the event opens the form, or only tells the parent it was clicked
  function hasForm(event: CalendarEvent): boolean {
    return options.popover() && canEdit(event)
  }

  function addEvent(event: CalendarEvent) {
    patch(event.id, event)
    emit.create(event)
  }

  function updateEvent(event: CalendarEvent) {
    // A form flushing its last keystroke after the delete would bring the event back
    if (overlay.value.get(event.id) === null) {
      return
    }

    patch(event.id, event)
    emit.update(event)
  }

  function removeEvent(id: string) {
    patch(id, null)
    emit.remove(id)
  }

  function clickEvent(event: CalendarEvent) {
    emit.eventClick(event)
  }

  // Month chunks the list has already reported, so scrolling back over one is not a new range
  const reported = new Set<string>()

  function reportRange(value: DateRange) {
    const key = `${value.start.getTime()}-${value.end.getTime()}`
    if (!reported.has(key)) {
      reported.add(key)
      emit.rangeChange(value)
    }
  }

  // ── Editor: which event has its form open ─────────────────────────────────────────────────────
  // One id for the whole calendar rather than a flag inside every chip: the layout re-creates a chip
  // whenever it moves to another day or another week, which is exactly what editing its dates does, and
  // a local flag would go down with it mid-edit
  const editingId = ref<string | null>(null)
  const editorAnchors = ref(0)

  function openEvent(id: string) {
    editingId.value = id
  }

  function closeEvent(id: string) {
    if (editingId.value === id) {
      editingId.value = null
    }
  }

  // The forms on screen, counted by the form itself: it only mounts while a popover is open, so the
  // two hooks always come in pairs
  function registerEditorAnchor() {
    onMounted(() => editorAnchors.value++)
    onUnmounted(() => editorAnchors.value--)
  }

  // Losing every form is how the id learns it has nowhere left to live: switching view, or the month
  // virtualizer recycling the row the event sits in
  watch(editorAnchors, (count) => {
    if (count || !editingId.value) {
      return
    }

    // A chip changing container unmounts during the patch and mounts back after it, so its
    // replacement gets a tick to turn up
    nextTick(() => {
      if (!editorAnchors.value) {
        editingId.value = null
      }
    })
  })

  // ── Draft: the event being drawn on the grid ──────────────────────────────────────────────────
  const draft = shallowRef<EventDraft | null>(null)
  // The pointer is still down: the ghost is being drawn and the popover waits for it to settle
  const drawing = ref(false)
  const draftOpen = computed(() => !!draft.value && !drawing.value)

  // The ghost currently anchoring the popover. Only arms once a ghost has mounted, so a draft is not
  // thrown away in the frames between creating it and the row it belongs to rendering
  const draftAnchors = ref(0)
  let everAnchored = false

  // Set by the `+` path and consumed by the ghost that mounts for it
  const pendingScroll = ref(false)
  let origin: HTMLElement | null = null

  // The draft rides through `layoutDay` and `layoutAllDay` as an event of its own, so it takes a real
  // slot and the day reflows around it
  const draftEvent = computed<CalendarEvent | null>(() => draft.value && {
    id: DRAFT_EVENT_ID,
    calendarId: draft.value.calendarId,
    color: draft.value.color,
    title: draft.value.title,
    start: toLocalISO(draft.value.start),
    end: toLocalISO(draft.value.end),
    allDay: draft.value.allDay || undefined,
  })

  // A hidden calendar would make the event vanish the moment it is created
  function defaultCalendarId(): string | undefined {
    const visible = calendars.value.find(calendar => !hiddenCalendars.value.includes(calendar.id))

    return visible?.id ?? calendars.value[0]?.id
  }

  function createDraft(input: { start: Date, end: Date, allDay?: boolean, title?: string, scroll?: boolean }) {
    const calendarId = defaultCalendarId()

    draft.value = {
      start: input.start,
      end: input.end,
      allDay: input.allDay ?? false,
      title: input.title ?? '',
      calendarId,
      // Without calendars the event carries its own colour, and needs one to start from
      color: calendarId ? undefined : 'primary',
      description: '',
      location: '',
    }

    everAnchored = false
    pendingScroll.value = input.scroll ?? false
    origin = document.activeElement as HTMLElement | null
  }

  // Shallow, so the form has to hand back a whole object rather than mutate the `Date`s the layout is
  // reading
  function updateDraft(value: Partial<EventDraft>) {
    if (draft.value) {
      draft.value = { ...draft.value, ...value }
    }
  }

  function discardDraft(refocus = false) {
    if (!draft.value) {
      return
    }

    draft.value = null
    drawing.value = false
    pendingScroll.value = false
    everAnchored = false

    const target = origin
    origin = null

    // Only where the draft was closed deliberately: an outside click has already put the focus
    // wherever it landed
    if (refocus && target?.isConnected) {
      target.focus()
    }
  }

  // Everything the event needs is already on the draft: what the ghost is showing is what gets saved.
  // Enter in the form commits it and hands the focus back the way Escape does
  function commitDraft(refocus = false) {
    if (!draft.value) {
      return
    }

    const value = draft.value

    addEvent({
      id: newId(),
      title: value.title || DEFAULT_TITLE,
      start: toLocalISO(value.start),
      end: toLocalISO(value.end),
      ...(value.allDay ? { allDay: true } : {}),
      ...(value.calendarId ? { calendarId: value.calendarId } : {}),
      ...(value.color ? { color: value.color } : {}),
      ...(value.description ? { description: value.description } : {}),
      ...(value.location ? { location: value.location } : {}),
    })

    discardDraft(refocus)
  }

  // The `+` button, `n` and the quick event input draw on the date the calendar is on
  function createAtAnchor(title = '') {
    if (!canCreate.value) {
      return
    }

    // `getHours() + 1` alone rolls a draft started at 23:xx into the next day
    const hour = Math.min(23, new Date().getHours() + 1)
    const start = addMinutes(startOfDay(toDate(date.value)), hour * 60)

    createDraft({ start, end: addMinutes(start, 60), title, scroll: true })
  }

  // What the phrase says is drawn as a draft rather than saved outright, so what was read into it is
  // on screen to be put right before it is. Always lands on its day, the grid moves there first
  async function createFromQuick(quick: QuickEvent | null, text: string) {
    // No time in it, so it goes where the `+` button would put it
    if (!quick) {
      return createAtAnchor(text)
    }

    if (!canCreate.value) {
      return
    }

    setDate(toCalendarDate(quick.start))
    await nextTick()

    createDraft({ ...quick, scroll: true })
  }

  interface Gesture {
    target: GridTarget
    x: number
    y: number
    rect: DOMRect
    anchorMinutes: number
    anchorDate: Date
    currentDate: Date
    moved: boolean
  }

  let gesture: Gesture | null = null

  // Events and the ghost handle their own pointers, and the day numbers and the "+N more" button are
  // buttons of their own
  function onEmptySpace(event: Event): boolean {
    return !(event.target as HTMLElement | null)?.closest('[data-event],[data-draft],a,button,[role="button"]')
  }

  // Bound for the length of a gesture only. The month view recycles the cell a drag started on, which
  // is why this is on the document rather than a pointer capture
  function bindGesture() {
    document.addEventListener('pointermove', onGesturePointermove)
    document.addEventListener('pointerup', onGesturePointerup)
    document.addEventListener('pointercancel', onGesturePointerup)
  }

  function unbindGesture() {
    document.removeEventListener('pointermove', onGesturePointermove)
    document.removeEventListener('pointerup', onGesturePointerup)
    document.removeEventListener('pointercancel', onGesturePointerup)
  }

  function endGesture() {
    gesture = null
    unbindGesture()
    drawing.value = false
  }

  function geometry(event: PointerEvent): { start: Date, end: Date, allDay: boolean } {
    const current = gesture!

    if (current.target.kind === 'timed') {
      const day = startOfDay(current.target.day)
      const minutes = minutesInColumn(event.clientY, current.rect)
      const from = Math.min(current.anchorMinutes, minutes)
      // A drag that never leaves its snap step would give an empty event, which the layout drops and
      // nothing would be drawn
      const to = Math.max(Math.max(current.anchorMinutes, minutes), from + SNAP_MINUTES)

      return { start: addMinutes(day, from), end: addMinutes(day, to), allDay: false }
    }

    // Keeps the last day it was over once the pointer leaves the grid
    current.currentDate = dateAtPoint(event.clientX, event.clientY) ?? current.currentDate

    const from = current.anchorDate < current.currentDate ? current.anchorDate : current.currentDate
    const to = current.anchorDate < current.currentDate ? current.currentDate : current.anchorDate

    return { start: startOfDay(from), end: addDays(startOfDay(to), 1), allDay: true }
  }

  function onGridPointerdown(event: PointerEvent, target: GridTarget) {
    // A touch drag has to stay a scroll. Nothing stands the second press of a double click down:
    // `PointerEvent.detail` is 0 by spec, and the ghost the double click draws replaces whatever that
    // press managed to start
    if (!canCreate.value || event.button !== 0 || event.pointerType === 'touch' || !onEmptySpace(event)) {
      return
    }

    // The column top is midnight, and measuring it once is what keeps the move handler off the layout
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()

    gesture = {
      target,
      x: event.clientX,
      y: event.clientY,
      rect,
      anchorMinutes: minutesInColumn(event.clientY, rect, 'floor'),
      anchorDate: target.day,
      currentDate: target.day,
      moved: false,
    }

    bindGesture()
  }

  function onGesturePointermove(event: PointerEvent) {
    if (!gesture) {
      return
    }

    // Nothing exists until the pointer has travelled: a plain click creates no draft, so neither half
    // of a double click has one to dismiss
    if (!gesture.moved) {
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < DRAG_THRESHOLD) {
        return
      }

      gesture.moved = true
      drawing.value = true
      createDraft(geometry(event))

      return
    }

    updateDraft(geometry(event))
  }

  function onGesturePointerup() {
    if (gesture) {
      endGesture()
    }
  }

  function onGridDblclick(event: MouseEvent, target: GridTarget) {
    if (!canCreate.value || !onEmptySpace(event)) {
      return
    }

    // Or the second click selects the hour label under the pointer
    event.preventDefault()
    getSelection()?.removeAllRanges()

    const day = startOfDay(target.day)

    if (target.kind === 'allDay') {
      createDraft({ start: day, end: addDays(day, 1), allDay: true })

      return
    }

    const minutes = target.kind === 'month'
      ? DEFAULT_HOUR * 60
      : minutesInColumn(event.clientY, (event.currentTarget as HTMLElement).getBoundingClientRect(), 'floor')
    const start = addMinutes(day, minutes)

    createDraft({ start, end: addMinutes(start, 60) })
  }

  function registerDraftAnchor() {
    onMounted(() => {
      draftAnchors.value++
      everAnchored = true
    })
    onUnmounted(() => draftAnchors.value--)
  }

  // Losing the ghost is how the draft learns it has nowhere left to live: switching view, the month
  // virtualizer recycling its row, the small-screen week window sliding past its day, or a date typed
  // into the form that lands outside the range on screen. It saves rather than discards, on the same
  // reading as closing the form: only Escape throws a draft away, so a title typed into one is never
  // lost to a keystroke
  watch(draftAnchors, (count) => {
    if (count || !draft.value || !everAnchored) {
      return
    }

    // A ghost changing container unmounts during the patch and mounts back after it, so its
    // replacement gets a tick to turn up
    nextTick(() => {
      if (!draftAnchors.value) {
        commitDraft()
      }
    })
  })

  // ── Move: dragging a chip to another day ──────────────────────────────────────────────────────
  // Moving a chip is a whole-day gesture: the month grid has no time axis and an all-day bar keeps the
  // span it has, so only the date shifts. `useEventDrag` stays with the week grid's timed blocks, where
  // the vertical axis is minutes. One instance for the whole calendar rather than one per chip: the
  // month view puts a few hundred chips on screen
  const moveSource = shallowRef<CalendarEvent | null>(null)
  const moveDeltaDays = ref(0)
  // Keeps the popover from opening on the click that ends a drag
  const moveSuppressed = ref(false)

  // The id a view drops from its own layout while the event is in flight
  const movingId = computed(() => moveSource.value?.id ?? null)

  // Where it would land, fed back through the layout so it draws in the cell the pointer is over rather
  // than being dragged over the top of one
  const movePreview = computed<CalendarEvent | null>(() => {
    if (!moveSource.value || !moveDeltaDays.value) {
      return moveSource.value
    }

    // `addDays` rather than the epoch, so the wall clock survives a DST edge
    return {
      ...moveSource.value,
      start: toLocalISO(addDays(new Date(moveSource.value.start), moveDeltaDays.value)),
      end: toLocalISO(addDays(new Date(moveSource.value.end), moveDeltaDays.value)),
    }
  })

  let move: { event: CalendarEvent, x: number, y: number, origin: Date, current: Date, moved: boolean, cancelled: boolean } | null = null

  function bindMove() {
    document.addEventListener('pointermove', onMovePointermove)
    document.addEventListener('pointerup', onMovePointerup)
    document.addEventListener('pointercancel', onMovePointerup)
  }

  function unbindMove() {
    document.removeEventListener('pointermove', onMovePointermove)
    document.removeEventListener('pointerup', onMovePointerup)
    document.removeEventListener('pointercancel', onMovePointerup)
  }

  function resetMove() {
    move = null
    unbindMove()
    moveSource.value = null
    moveDeltaDays.value = 0
  }

  // Let the trailing click pass before the popover is allowed to open again
  function releaseMove() {
    setTimeout(() => {
      moveSuppressed.value = false
    })
  }

  function onChipPointerdown(pointerEvent: PointerEvent, event: CalendarEvent) {
    // A touch drag has to stay a scroll
    if (!canEdit(event) || pointerEvent.button !== 0 || pointerEvent.pointerType === 'touch') {
      return
    }

    // A chip listed in a "+N more" popover is drawn over the grid rather than in it, and `dateAtPoint`
    // hit-tests through the popover to whichever cell happens to sit behind it. There is no day under
    // that pointer to move to
    if ((pointerEvent.target as HTMLElement).closest('[data-reka-popper-content-wrapper]')) {
      return
    }

    // The day under the pointer rather than the event's own start: a bar grabbed in the middle should
    // travel the days the pointer does
    const at = dateAtPoint(pointerEvent.clientX, pointerEvent.clientY)
    if (!at) {
      return
    }

    move = { event, x: pointerEvent.clientX, y: pointerEvent.clientY, origin: at, current: at, moved: false, cancelled: false }

    bindMove()
  }

  function onMovePointermove(pointerEvent: PointerEvent) {
    if (!move || move.cancelled) {
      return
    }

    if (!move.moved) {
      if (Math.hypot(pointerEvent.clientX - move.x, pointerEvent.clientY - move.y) < DRAG_THRESHOLD) {
        return
      }

      move.moved = true
      moveSuppressed.value = true
      // Only past the threshold, so a plain click never drops the event out of its own cell for a frame
      moveSource.value = move.event
    }

    // Keeps the last day it was over once the pointer leaves the grid
    move.current = dateAtPoint(pointerEvent.clientX, pointerEvent.clientY) ?? move.current

    moveDeltaDays.value = differenceInCalendarDays(move.current, move.origin)
  }

  function onMovePointerup() {
    if (!move) {
      return
    }

    const event = moveSource.value
    const delta = moveDeltaDays.value

    if (move.moved && event && delta) {
      updateEvent({
        ...event,
        start: toLocalISO(addDays(new Date(event.start), delta)),
        end: toLocalISO(addDays(new Date(event.end), delta)),
      })
    }

    resetMove()
    releaseMove()
  }

  // ── External drop: something dragged in from outside the calendar ─────────────────────────────
  const dropTarget = ref<string | null>(null)

  function dropKey(target: GridTarget): string {
    return `${target.kind}:${isoDate(target.day)}`
  }

  function isDropTarget(target: GridTarget): boolean {
    return dropTarget.value === dropKey(target)
  }

  function onDragover(event: DragEvent, target: GridTarget) {
    if (!options.droppable()) {
      return
    }

    // What marks the element as a drop target at all, without it `drop` never fires
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
    dropTarget.value = dropKey(target)
  }

  function onDragleave(target: GridTarget) {
    if (dropTarget.value === dropKey(target)) {
      dropTarget.value = null
    }
  }

  function onDrop(event: DragEvent, target: GridTarget) {
    if (!options.droppable()) {
      return
    }

    event.preventDefault()
    dropTarget.value = null

    const transfer = event.dataTransfer
    const data = transfer?.getData('application/x-calendar-item') || transfer?.getData('application/x-task') || transfer?.getData('text/plain')
    if (!data) {
      return
    }

    const day = startOfDay(target.day)

    if (target.kind === 'timed') {
      const minutes = minutesInColumn(event.clientY, (event.currentTarget as HTMLElement).getBoundingClientRect(), 'floor')
      const start = addMinutes(day, minutes)

      emit.externalDrop({ start: toLocalISO(start), end: toLocalISO(addMinutes(start, 60)), allDay: false, data, event })

      return
    }

    emit.externalDrop({ start: toLocalISO(day), end: toLocalISO(addDays(day, 1)), allDay: true, data, event })
  }

  // ── Window listeners, cleaned up with the root ────────────────────────────────────────────────
  useEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return
    }

    // Cancels the drawing outright. Once the popover is up, Escape is its own and dismissing it
    // discards the draft from there
    if (gesture?.moved) {
      endGesture()
      discardDraft()
    }

    // Cancels the move but holds on to the gesture: the pointer is still down, and its release is both
    // what clears the suppression and what unbinds the listeners that would carry it
    if (move?.moved) {
      move.cancelled = true
      move.moved = false
      moveSource.value = null
      moveDeltaDays.value = 0
    }
  })

  // Releasing the pointer outside the window after switching apps fires neither pointerup nor
  // pointercancel
  useEventListener('blur', () => {
    if (gesture) {
      endGesture()
    }

    if (move || moveSuppressed.value) {
      resetMove()
      releaseMove()
    }
  })

  onUnmounted(() => {
    unbindGesture()
    unbindMove()
  })

  return {
    // view and date
    view,
    date,
    range,
    title,
    visibleMonth,
    formSide,
    prevDate,
    nextDate,
    weekStartsOn,
    format,
    loading,
    setDate,
    setView,
    // events
    calendars,
    hiddenCalendars,
    events,
    eventsForDay,
    eventsForDays,
    colorOf,
    canEdit,
    hasForm,
    canCreate,
    addEvent,
    updateEvent,
    removeEvent,
    clickEvent,
    reportRange,
    // editor
    editingId,
    openEvent,
    closeEvent,
    registerEditorAnchor,
    // draft
    draft,
    drawing,
    draftOpen,
    draftEvent,
    pendingScroll,
    createDraft,
    updateDraft,
    discardDraft,
    commitDraft,
    createAtAnchor,
    createFromQuick,
    onGridPointerdown,
    onGridDblclick,
    registerDraftAnchor,
    // move
    movingId,
    movePreview,
    moveSuppressed,
    onChipPointerdown,
    // external drop
    isDropTarget,
    onDragover,
    onDragleave,
    onDrop,
  }
}

export type CalendarContext = ReturnType<typeof createCalendarContext>

const CALENDAR_CONTEXT: InjectionKey<CalendarContext> = Symbol('proto-calendar')

export function provideCalendarContext(options: CalendarContextOptions): CalendarContext {
  const context = createCalendarContext(options)
  provide(CALENDAR_CONTEXT, context)

  return context
}

export function useCalendarContext(): CalendarContext {
  const context = inject(CALENDAR_CONTEXT, null)
  if (!context) {
    throw new Error('Calendar components must be rendered inside <ProtoCalendarView>')
  }

  return context
}
