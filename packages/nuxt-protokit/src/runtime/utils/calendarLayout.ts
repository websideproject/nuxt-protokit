import type { CalendarColor, CalendarEvent, CalendarEventLayout } from '../types/calendar'

// ── Timezone-safe date helpers ────────────────────────────────────────────────

/** Returns a local ISO string "YYYY-MM-DDTHH:mm:ss" (never UTC) */
export function toLocalISOString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date())
}

export function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

/** "YYYY-M-D" key for Map lookups */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// ── Formatting ────────────────────────────────────────────────────────────────

function parseLocalISO(s: string): Date {
  const [datePart, timePart = '00:00:00'] = s.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute)
}

function formatHourInternal(h: number, m: number = 0): string {
  const suffix = h < 12 ? 'am' : 'pm'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`
}

export function formatHour(h: number): string {
  return formatHourInternal(h)
}

export function formatTimeRange(startAt: string, endAt: string): string {
  const s = parseLocalISO(startAt)
  const e = parseLocalISO(endAt)
  return `${formatHourInternal(s.getHours(), s.getMinutes())} – ${formatHourInternal(e.getHours(), e.getMinutes())}`
}

/** Short start time like "9am" or "9:30am" */
export function formatStartTime(startAt: string): string {
  const s = parseLocalISO(startAt)
  return formatHourInternal(s.getHours(), s.getMinutes())
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function formatMonthTitle(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

export function formatWeekTitle(d: Date): string {
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay())
  const end = addDays(start, 6)
  if (start.getMonth() === end.getMonth()) {
    return `${SHORT_MONTH_NAMES[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${SHORT_MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${SHORT_MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
  }
  return `${SHORT_MONTH_NAMES[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()} – ${SHORT_MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
}

export function formatDayTitle(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

// ── Calendar grid ─────────────────────────────────────────────────────────────

export function buildMonthWeeks(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const start = addDays(firstDay, -startOffset)

  const lastDay = new Date(year, month + 1, 0)
  const endOffset = 6 - lastDay.getDay()
  const end = addDays(lastDay, endOffset)

  const weeks: Date[][] = []
  let current = start
  while (current <= end) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current))
      current = addDays(current, 1)
    }
    weeks.push(week)
  }
  return weeks
}

// ── Event helpers ─────────────────────────────────────────────────────────────

export function getEventsInRange(events: CalendarEvent[], from: Date, to: Date): CalendarEvent[] {
  const fromStr = toLocalISOString(from)
  const toStr = toLocalISOString(to)
  return events.filter(e => e.startAt < toStr && e.endAt > fromStr)
}

// ── Overlap layout ────────────────────────────────────────────────────────────

export function computeOverlapLayout(
  events: CalendarEvent[],
  windowStart: Date,
  windowEnd: Date,
): Map<string, CalendarEventLayout> {
  const winStartStr = toLocalISOString(windowStart)
  const winEndStr = toLocalISOString(windowEnd)

  const visible = events.filter(e => e.startAt < winEndStr && e.endAt > winStartStr)

  const sorted = [...visible].sort((a, b) => {
    if (a.startAt !== b.startAt) return a.startAt < b.startAt ? -1 : 1
    const aDur = a.endAt.localeCompare(a.startAt)
    const bDur = b.endAt.localeCompare(b.startAt)
    return bDur - aDur
  })

  const colMap = new Map<string, number>()
  const columns: string[] = []

  for (const event of sorted) {
    let assigned = -1
    for (let c = 0; c < columns.length; c++) {
      if (columns[c] <= event.startAt) {
        assigned = c
        break
      }
    }
    if (assigned === -1) {
      assigned = columns.length
      columns.push('')
    }
    columns[assigned] = event.endAt
    colMap.set(event.id, assigned)
  }

  const result = new Map<string, CalendarEventLayout>()
  for (const event of sorted) {
    const col = colMap.get(event.id)!
    const peers = sorted.filter(e =>
      e.startAt < event.endAt && event.startAt < e.endAt,
    )
    const total = Math.max(...peers.map(p => (colMap.get(p.id) ?? 0))) + 1
    result.set(event.id, { col, total })
  }

  return result
}

// ── Color styles (inline CSS — no Tailwind class scanning needed) ─────────────
// Uses Tailwind v4 CSS custom properties exposed globally as --color-{name}-{shade}

export function getEventColorStyle(color: CalendarColor): {
  background: string
  color: string
  borderColor: string
} {
  return {
    background: `color-mix(in srgb, var(--color-${color}-500) 18%, transparent)`,
    color: `var(--color-${color}-700)`,
    borderColor: `var(--color-${color}-500)`,
  }
}

// Keep COLOR_CLASSES for any code that needs class strings in .vue templates
// These classes ARE in .vue files so Tailwind will scan them.
export const COLOR_CLASSES: Record<CalendarColor, { bg: string, text: string, border: string }> = {
  red: { bg: 'bg-red-500/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-500' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-500' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-500' },
  lime: { bg: 'bg-lime-500/20', text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-500' },
  green: { bg: 'bg-green-500/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-500' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500' },
  teal: { bg: 'bg-teal-500/20', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-500' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-500' },
  sky: { bg: 'bg-sky-500/20', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-500' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500' },
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-500' },
  violet: { bg: 'bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-500' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500' },
  fuchsia: { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-500' },
  pink: { bg: 'bg-pink-500/20', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-500' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-500' },
  neutral: { bg: 'bg-neutral-500/20', text: 'text-neutral-700 dark:text-neutral-300', border: 'border-neutral-500' },
}
