/**
 * Deep clone via JSON serialization.
 * Safe for plain data (no functions, Dates become strings, no circular refs).
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}
