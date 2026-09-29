import { addDays, addMinutes, startOfDay } from 'date-fns'
import type { CalendarEvent as StoredCalendarEvent } from '../types/calendar'
import type { CalendarEvent } from './types'
import { toLocalISO } from './dates'

// The two event shapes <ProtoCalendar> sits between. Stored events (the Y.js list) end an all-day
// event on its last day, and older ones may carry `T23:59:59` there; the view's ranges are [start, end)
// and end it at 00:00 the day after. A timed event that ends where it starts covers no time and the
// view would not draw it, so it gets the half hour the layout paints as a minimum anyway.

export function fromStoredEvent(stored: StoredCalendarEvent): CalendarEvent {
  const start = new Date(stored.startAt)
  const storedEnd = new Date(stored.endAt || stored.startAt)

  let end: Date
  if (stored.allDay) {
    const first = startOfDay(start)
    const last = startOfDay(storedEnd)
    end = addDays(last < first ? first : last, 1)
  }
  else {
    end = storedEnd > start ? storedEnd : addMinutes(start, 30)
  }

  return {
    id: stored.id,
    title: stored.title,
    start: toLocalISO(stored.allDay ? startOfDay(start) : start),
    end: toLocalISO(end),
    allDay: stored.allDay || undefined,
    color: stored.color,
    description: stored.description || undefined,
    location: stored.location || undefined,
  }
}

/** The stored fields a view event maps to. `linkedTaskId` is the store's own and is left alone. */
export function toStoredPatch(event: CalendarEvent): Omit<StoredCalendarEvent, 'id' | 'linkedTaskId'> {
  const end = new Date(event.end)

  return {
    title: event.title,
    startAt: event.start,
    // An all-day event's last day sits a day before its exclusive end
    endAt: event.allDay ? toLocalISO(addDays(startOfDay(end), -1)) : event.end,
    allDay: !!event.allDay,
    color: event.color ?? 'blue',
    description: event.description ?? '',
    location: event.location ?? '',
  }
}
