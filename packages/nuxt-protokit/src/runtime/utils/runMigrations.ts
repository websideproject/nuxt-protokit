/**
 * Applies schema migrations step by step from storedVersion up to currentVersion.
 * Each key in `migrations` is the TARGET version number.
 * Steps with no migration entry are skipped (treated as defaults-only changes).
 *
 * @example
 * // Stored at v2, current is v5 → runs migrations[3], [4], [5] in order
 * runMigrations(data, 2, 5, {
 *   3: data => ({ ...data, newField: data.oldField }),
 *   4: data => ({ ...data, status: data.active ? 'active' : 'inactive' }),
 *   5: data => ({ ...data, priority: data.urgency ?? 'medium' }),
 * })
 */
export function runMigrations(
  data: Record<string, any>,
  storedVersion: number,
  currentVersion: number,
  migrations: Record<number, (data: Record<string, any>) => Record<string, any>>,
): Record<string, any> {
  let result = data
  for (let v = storedVersion + 1; v <= currentVersion; v++) {
    if (migrations[v]) {
      result = migrations[v](result)
    }
  }
  return result
}
