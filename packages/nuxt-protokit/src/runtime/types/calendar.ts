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

/** Tailwind default 500-shade hex values — used for inline styles so no CSS var scanning needed */
export const CALENDAR_COLOR_HEX: Record<CalendarColor, string> = {
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
  neutral: '#737373',
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
