// The calendar event as `useProtoCalendar` stores it in the Y.js document. This shape is persisted in
// users' IndexedDB and synced between tabs, so it stays as it is: `startAt`/`endAt`, and an all-day
// event's `endAt` is its LAST day (inclusive). <ProtoCalendar> converts to and from the view's
// [start, end) events in `calendar/stored.ts`.
import type { CalendarColor, CalendarView } from '../calendar/types'

export type { CalendarColor, CalendarView }
export { CALENDAR_COLORS } from '../calendar/colors'

export interface CalendarEvent {
  id: string
  title: string
  startAt: string // local ISO datetime: "YYYY-MM-DDTHH:mm:ss"
  endAt: string // local ISO datetime — must be >= startAt; for all-day events, the last day
  allDay: boolean
  color: CalendarColor
  description: string
  location: string
  /** Optional id of the source task this event was created from */
  linkedTaskId: string
}

export const CALENDAR_EVENT_DEFAULTS: CalendarEvent = {
  id: '',
  title: '',
  startAt: '',
  endAt: '',
  allDay: false,
  color: 'blue',
  description: '',
  location: '',
  linkedTaskId: '',
}
