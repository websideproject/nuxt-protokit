import { afterEach } from 'vitest'

/**
 * After each test, delete any IndexedDB databases that tests may have created.
 * We track them via a global Set populated by deleteTestDb().
 */
declare global {

  var __testDbs: Set<string>
}

globalThis.__testDbs = new Set()

export function trackTestDb(name: string) {
  globalThis.__testDbs.add(name)
}

afterEach(async () => {
  const names = [...globalThis.__testDbs]
  globalThis.__testDbs.clear()
  await Promise.all(
    names.map(
      name =>
        new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase(name)
          req.onsuccess = () => resolve()
          req.onerror = () => resolve()
          req.onblocked = () => resolve()
        }),
    ),
  )
})
