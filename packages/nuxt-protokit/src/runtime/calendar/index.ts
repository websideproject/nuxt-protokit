// Public surface of the calendar kit: `import { fromStoredEvent } from '#protokit/calendar'`.
//
// The components are global (ProtoCalendarView, ProtoCalendarMini, …) and deliberately not re-exported
// here. Everything a consumer needs goes through <ProtoCalendarView>'s props and emits; the inner views
// read the context it provides and cannot render outside it. <ProtoCalendar> is the same view bound to
// a Y.js document through `useProtoCalendar`.
//
// The view's event is exported as `CalendarViewEvent`: `CalendarEvent` is already the stored shape
// `useProtoCalendar` keeps (see types/calendar.ts).
export type { CalendarEvent as CalendarViewEvent } from './types'
export type {
  CalendarColor, CalendarExternalDrop, CalendarPaletteColor, CalendarSemanticColor, CalendarSource,
  CalendarView, DateRange, WeekStartsOn,
} from './types'
export { CALENDAR_COLORS, CALENDAR_PALETTE_COLORS, CALENDAR_SEMANTIC_COLORS, calendarColorValue } from './colors'
export { toLocalISO, toCalendarDate, toDate, todayDate } from './dates'
export { parseQuickEvent } from './quickEvent'
export type { QuickEvent } from './quickEvent'
export { fromStoredEvent, toStoredPatch } from './stored'
