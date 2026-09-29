import { CalendarDate, getLocalTimeZone, parseDate, Time, toCalendarDateTime, today } from '@internationalized/date'
import { addDays, lightFormat, startOfMonth, startOfWeek } from 'date-fns'
import type { CalendarView, DateRange, WeekStartsOn } from './types'

// Events are floating local datetimes, no timezone designator: `new Date()` parses them in the
// viewer's own timezone. Date-only strings would parse as UTC instead, so always emit the full
// date-time form. Seconds are pinned to zero, the calendar is minute-granular
export function toLocalISO(date: Date): string {
  return lightFormat(date, 'yyyy-MM-dd\'T\'HH:mm:00')
}

export function toCalendarDate(date: Date): CalendarDate {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function toTime(date: Date): Time {
  return new Time(date.getHours(), date.getMinutes())
}

// `getLocalTimeZone` resolves an `Intl.DateTimeFormat` on every call and the month view runs this
// date math on every scroll frame
let localTimeZone: string | undefined

export function timeZone(): string {
  return localTimeZone ??= getLocalTimeZone()
}

export function toDate(date: CalendarDate): Date {
  return date.toDate(timeZone())
}

export function toDateTime(date: CalendarDate, time: Time): Date {
  return toCalendarDateTime(date, time).toDate(timeZone())
}

export function todayDate(): CalendarDate {
  return today(timeZone())
}

// Identifies the local calendar day an event falls on, from the date parts so it stays correct
// across DST and costs less than a formatter
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// The day a grid cell stands for, as the `data-date` a pointer gesture reads back off it. `dayKey` is
// the cheaper bucket key and does not parse back
export function isoDate(date: Date): string {
  return lightFormat(date, 'yyyy-MM-dd')
}

// A drag spends dozens of moves inside one cell, and each one would otherwise allocate a
// `CalendarDate` and convert it back through the timezone
let lastISO: string | undefined
let lastDate: Date | undefined

export function dateFromISO(iso: string): Date {
  if (iso !== lastISO) {
    lastISO = iso
    lastDate = toDate(parseDate(iso))
  }

  return lastDate!
}

// The day under a point, from whichever cell is topmost there. Hit-testing live rather than measuring
// the cells upfront is what lets a drag reach a month row the virtualizer only mounted once the
// pointer got near it
export function dateAtPoint(x: number, y: number): Date | null {
  for (const element of document.elementsFromPoint(x, y)) {
    const iso = (element as HTMLElement).dataset?.date
    if (iso) {
      return dateFromISO(iso)
    }
  }

  return null
}

// Ranges are [start, end) so the end boundary is the first excluded instant
export function weekRange(date: CalendarDate, weekStartsOn: WeekStartsOn, days = 7): DateRange {
  const start = days === 7 ? startOfWeek(toDate(date), { weekStartsOn }) : toDate(date)

  return { start, end: addDays(start, days) }
}

// Always 6 rows of 7 days so the grid height never jumps between months
export function monthRange(date: CalendarDate, weekStartsOn: WeekStartsOn): DateRange {
  const start = startOfWeek(startOfMonth(toDate(date)), { weekStartsOn })

  return { start, end: addDays(start, 42) }
}

// What the month view's SSR fallback renders: the grid's six weeks plus the rows a tall viewport shows
// below them, so a refresh paints real events all the way down instead of placeholders
export const MONTH_FETCH_WEEKS = 12

export function rangeFor(view: CalendarView, date: CalendarDate, weekStartsOn: WeekStartsOn): DateRange {
  if (view === 'month') {
    const { start } = monthRange(date, weekStartsOn)

    return { start, end: addDays(start, MONTH_FETCH_WEEKS * 7) }
  }

  return weekRange(date, weekStartsOn, view === 'day' ? 1 : 7)
}

export function eachDay({ start, end }: DateRange): Date[] {
  const days: Date[] = []
  for (let day = start; day < end; day = addDays(day, 1)) {
    days.push(day)
  }

  return days
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export interface RangeTitle {
  months: string
  year: string
}

export interface CalendarFormatters {
  time: (date: Date) => string
  day: (date: Date) => string
  fullDate: (date: Date) => string
  weekday: (date: Date) => string
  month: (date: Date) => string
  shortMonth: (date: Date) => string
  rangeTitle: (range: DateRange) => RangeTitle
}

// Constructing a formatter costs far more than formatting with it, and these run once per event chip
// and per day cell of every rendered week, so each locale builds its set once
const formatterCache = new Map<string, CalendarFormatters>()

export function calendarFormatters(locale: string): CalendarFormatters {
  const cached = formatterCache.get(locale)
  if (cached) {
    return cached
  }

  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const day = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' })
  const fullDate = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const month = new Intl.DateTimeFormat(locale, { month: 'long' })
  const shortMonth = new Intl.DateTimeFormat(locale, { month: 'short' })
  const shortMonthYear = new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' })

  const formatters: CalendarFormatters = {
    time: date => time.format(date),
    day: date => day.format(date),
    fullDate: date => fullDate.format(date),
    weekday: date => weekday.format(date),
    month: date => month.format(date),
    shortMonth: date => shortMonth.format(date),
    rangeTitle({ start, end }) {
      const last = addDays(end, -1)
      const year = String(last.getFullYear())

      if (start.getMonth() === last.getMonth()) {
        return { months: month.format(start), year }
      }

      const startMonth = (start.getFullYear() !== last.getFullYear() ? shortMonthYear : shortMonth).format(start)

      return { months: `${startMonth} – ${shortMonth.format(last)}`, year }
    },
  }

  formatterCache.set(locale, formatters)

  return formatters
}
