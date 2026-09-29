import { describe, it, expect } from 'vitest'
import { fromStoredEvent, toStoredPatch } from '../../src/runtime/calendar/stored'
import { layoutAllDay, layoutDay, MIN_EVENT_MINUTES, PX_PER_MINUTE } from '../../src/runtime/calendar/layout'
import { CALENDAR_EVENT_DEFAULTS } from '../../src/runtime/types/calendar'
import type { CalendarEvent as StoredCalendarEvent } from '../../src/runtime/types/calendar'
import type { CalendarEvent } from '../../src/runtime/calendar/types'

function stored(patch: Partial<StoredCalendarEvent>): StoredCalendarEvent {
  return { ...CALENDAR_EVENT_DEFAULTS, id: 'e1', title: 'Event', ...patch }
}

describe('fromStoredEvent', () => {
  it('ends a one-day all-day event at 00:00 the next day', () => {
    const event = fromStoredEvent(stored({ allDay: true, startAt: '2026-03-10T00:00:00', endAt: '2026-03-10T00:00:00' }))
    expect(event.start).toBe('2026-03-10T00:00:00')
    expect(event.end).toBe('2026-03-11T00:00:00')
    expect(event.allDay).toBe(true)
  })

  it('reads an inclusive multi-day span, including the older 23:59:59 ends', () => {
    expect(fromStoredEvent(stored({ allDay: true, startAt: '2026-03-10T00:00:00', endAt: '2026-03-12T00:00:00' })).end)
      .toBe('2026-03-13T00:00:00')
    expect(fromStoredEvent(stored({ allDay: true, startAt: '2026-03-10T00:00:00', endAt: '2026-03-12T23:59:59' })).end)
      .toBe('2026-03-13T00:00:00')
  })

  it('never ends an all-day event before its first day', () => {
    const event = fromStoredEvent(stored({ allDay: true, startAt: '2026-03-10T00:00:00', endAt: '2026-03-08T00:00:00' }))
    expect(event.end).toBe('2026-03-11T00:00:00')
  })

  it('gives a zero-length timed event half an hour, or the view would not draw it', () => {
    const event = fromStoredEvent(stored({ startAt: '2026-03-10T09:00:00', endAt: '2026-03-10T09:00:00' }))
    expect(event.end).toBe('2026-03-10T09:30:00')
  })

  it('keeps a timed event as it is', () => {
    const event = fromStoredEvent(stored({ startAt: '2026-03-10T09:15:00', endAt: '2026-03-10T10:45:00', color: 'rose', location: 'Room 2' }))
    expect(event).toMatchObject({ start: '2026-03-10T09:15:00', end: '2026-03-10T10:45:00', color: 'rose', location: 'Room 2' })
    expect(event.allDay).toBeUndefined()
  })
})

describe('toStoredPatch', () => {
  it('writes an all-day event back with its last day as endAt', () => {
    const patch = toStoredPatch({ id: 'e1', title: 'Trip', start: '2026-03-10T00:00:00', end: '2026-03-13T00:00:00', allDay: true })
    expect(patch).toMatchObject({ startAt: '2026-03-10T00:00:00', endAt: '2026-03-12T00:00:00', allDay: true })
  })

  it('round-trips through the view unchanged', () => {
    const original = stored({ allDay: true, startAt: '2026-03-10T00:00:00', endAt: '2026-03-12T00:00:00', color: 'teal', description: 'd', location: 'l' })
    const { id: _id, linkedTaskId: _linked, ...rest } = original
    expect(toStoredPatch(fromStoredEvent(original))).toEqual(rest)
  })
})

describe('layoutDay', () => {
  const day = new Date(2026, 2, 10)
  const at = (h: number, m = 0) => `2026-03-10T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
  const event = (id: string, start: string, end: string): CalendarEvent => ({ id, title: id, start, end })

  it('splits an overlapping cluster into columns and leaves the rest full width', () => {
    const positioned = layoutDay([
      event('a', at(9), at(10)),
      event('b', at(9, 30), at(11)),
      event('c', at(14), at(15)),
    ], day)

    const byId = Object.fromEntries(positioned.map(p => [p.event.id, p]))
    expect(byId.a).toMatchObject({ left: 0, width: 50 })
    expect(byId.b).toMatchObject({ left: 50, width: 50 })
    expect(byId.c).toMatchObject({ left: 0, width: 100, top: 14 * 60 * PX_PER_MINUTE })
  })

  it('paints a short event at the minimum height', () => {
    const [positioned] = layoutDay([event('a', at(9), at(9, 15))], day)
    expect(positioned!.height).toBe(MIN_EVENT_MINUTES * PX_PER_MINUTE)
  })
})

describe('layoutAllDay', () => {
  it('packs overlapping bars into lanes and spans the days they cover', () => {
    const days = Array.from({ length: 7 }, (_, i) => new Date(2026, 2, 9 + i))
    const bars = layoutAllDay([
      { id: 'a', title: 'a', start: '2026-03-09T00:00:00', end: '2026-03-12T00:00:00', allDay: true },
      { id: 'b', title: 'b', start: '2026-03-10T00:00:00', end: '2026-03-11T00:00:00', allDay: true },
      { id: 'c', title: 'c', start: '2026-03-12T00:00:00', end: '2026-03-13T00:00:00', allDay: true },
    ], days)

    const byId = Object.fromEntries(bars.map(b => [b.event.id, b]))
    expect(byId.a).toMatchObject({ colStart: 0, colSpan: 3, lane: 0 })
    expect(byId.b).toMatchObject({ colStart: 1, colSpan: 1, lane: 1 })
    expect(byId.c).toMatchObject({ colStart: 3, colSpan: 1, lane: 0 })
  })
})
