/**
 * Poll until `fn()` returns true (or a truthy value) without throwing.
 * Rejects with a timeout error if the condition is never met.
 */
export function waitFor(fn: () => boolean | Promise<boolean>, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = async () => {
      try {
        const result = await fn()
        if (result) {
          resolve()
          return
        }
      }
      catch {
        // not ready yet
      }
      if (Date.now() - start > timeout) {
        reject(new Error(`waitFor timed out after ${timeout}ms`))
        return
      }
      setTimeout(check, 20)
    }
    check()
  })
}
