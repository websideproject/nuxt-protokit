/**
 * Stand-in for Nuxt's `#imports` in the browser tests, which run the runtime composables without a Nuxt app.
 * Server sync is off: tests exercise IndexedDB persistence only.
 */
export function useRuntimeConfig() {
  return { public: {} }
}
