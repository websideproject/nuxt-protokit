// Calendar types. Adapted from the Nuxt UI calendar template (MIT,
// github.com/nuxt-ui-templates/calendar), reshaped from an app into a component kit: the events come
// in as a prop and every change goes back out as an emit, so the calendar owns no persistence.

export type CalendarView = 'day' | 'week' | 'month'

/** 0 = Sunday … 6 = Saturday, the `date-fns` convention. */
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Nuxt UI's semantic colours, which follow the app theme. */
export type CalendarSemanticColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

/** Tailwind palette hues, for when a calendar needs more than six distinguishable colours. */
export type CalendarPaletteColor
  = | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green'
    | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo'
    | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose'

export type CalendarColor = CalendarSemanticColor | CalendarPaletteColor

/** A source events belong to. It carries the colour, and the sidebar list can hide it. */
export interface CalendarSource {
  id: string
  name: string
  color: CalendarColor
}

export interface CalendarEvent {
  id: string
  title: string
  // Floating local datetimes, `YYYY-MM-DDTHH:mm:ss` with no timezone designator: `new Date()` reads
  // them in the viewer's own zone, so a 09:15 stand-up is 09:15 wherever it is looked at. The range
  // is [start, end): an all-day event on the 3rd ends at 00:00 on the 4th.
  start: string
  end: string
  allDay?: boolean
  calendarId?: string
  /** Overrides the calendar's colour. */
  color?: CalendarColor
  description?: string
  location?: string
  /** `false` locks this one event: no drag, no resize, no form. A click still emits `event-click`. */
  editable?: boolean
}

export interface DateRange {
  start: Date
  end: Date
}

export interface CalendarExternalDrop {
  start: string
  end: string
  allDay: boolean
  /** What the dragged item carried: `application/x-calendar-item`, then `application/x-task`, then `text/plain`. */
  data: string
  event: DragEvent
}
