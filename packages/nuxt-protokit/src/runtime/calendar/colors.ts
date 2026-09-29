import type { CalendarColor, CalendarPaletteColor, CalendarSemanticColor } from './types'

export const CALENDAR_SEMANTIC_COLORS: CalendarSemanticColor[] = ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral']

export const CALENDAR_PALETTE_COLORS: CalendarPaletteColor[] = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green',
  'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo',
  'violet', 'purple', 'fuchsia', 'pink', 'rose',
]

export const CALENDAR_COLORS: CalendarColor[] = [...CALENDAR_SEMANTIC_COLORS, ...CALENDAR_PALETTE_COLORS]

// Tailwind's 500 shades. Hex rather than `var(--color-red-500)`: Tailwind only emits a theme variable
// the app itself uses, and a hue nobody else picked would resolve to nothing
const PALETTE_HEX: Record<CalendarPaletteColor, string> = {
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
}

/** The CSS colour an event is painted with, handed to the class maps below as `--cal-color`. */
export function calendarColorValue(color: CalendarColor): string {
  if (color === 'neutral') {
    return 'var(--ui-color-neutral-500)'
  }

  return color in PALETTE_HEX ? PALETTE_HEX[color as CalendarPaletteColor] : `var(--ui-${color})`
}

export function calendarColorStyle(color: CalendarColor): Record<string, string> {
  return { '--cal-color': calendarColorValue(color) }
}

// One colour variable instead of the template's per-colour class maps, so a palette hue costs no
// extra classes. `data-active` is the hover shade held: a chip wears it while its popover is open and
// while it is being dragged. A variant rather than a second `bg-*`, which would leave the two to sort
// themselves out in the stylesheet
export const eventBlockClass = 'bg-(--cal-color)/15 hover:bg-(--cal-color)/25 data-active:bg-(--cal-color)/25 text-(--cal-color) border-(--cal-color)'

// The phone month cell has no room for a dot and a time, so below `lg` a timed chip becomes Apple's
// tinted pill: the calendar colour carried by the fill, only the title inside
export const eventChipCompactClass = 'max-lg:bg-(--cal-color)/15 max-lg:text-(--cal-color)'

export const calendarDotClass = 'bg-(--cal-color)'

// The focus ring the button theme paints: the colour at a quarter, which only gets a width once
// `focus-visible` gives the outline one
export const eventOutlineClass = 'outline-(--cal-color)/25'
