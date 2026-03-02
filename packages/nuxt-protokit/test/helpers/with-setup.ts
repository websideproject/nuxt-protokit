import { createApp, defineComponent } from 'vue'

/**
 * Run a composable inside a minimal Vue app so it has lifecycle hooks
 * (onUnmounted, etc.) available. Returns the composable result and a
 * `cleanup` function that unmounts the app.
 */
export function withSetup<T>(composable: () => T): { result: T; cleanup: () => void } {
  let result!: T
  const app = createApp(
    defineComponent({
      setup() {
        result = composable()
        // Render nothing
        return () => null
      },
    }),
  )
  const el = document.createElement('div')
  app.mount(el)
  return {
    result,
    cleanup: () => app.unmount(),
  }
}
