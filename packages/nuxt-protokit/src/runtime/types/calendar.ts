export type CalendarColor = 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green'
  | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo'
  | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose' | 'neutral'

export type CalendarView = 'month' | 'week' | 'day'

export interface CalendarEvent {
  id: string
  title: string
  startAt: string // local ISO datetime: "YYYY-MM-DDTHH:mm:ss"
  endAt: string // local ISO datetime — must be >= startAt
  allDay: boolean
  color: CalendarColor
  description: string
  location: string
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
}

export const CALENDAR_COLORS: CalendarColor[] = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green',
  'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo',
  'violet', 'purple', 'fuchsia', 'pink', 'rose', 'neutral',
]

export interface CalendarDragState {
  eventId: string
  originalStartAt: string
  originalEndAt: string
  startY: number
  startX: number
  pxPerMinute: number
  deltaMinutes: number
}

export interface CalendarEventLayout {
  col: number // 0-based within group
  total: number // columns in group
}
