/**
 * Bar colour classes for the Nuxt UI colour names, written out in full so Tailwind generates them.
 */
const BAR_CLASS: Record<string, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  error: 'bg-error',
  neutral: 'bg-inverted',
}

/**
 * A visualization colour as a background class: a Nuxt UI colour name (`'error'`, as badges take it) maps to its
 * class (`bg-error`); anything else is used as given (`'bg-emerald-500'`).
 */
export function barColorClass(color: string): string {
  return BAR_CLASS[color] ?? color
}
