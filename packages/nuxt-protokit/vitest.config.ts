import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'

const nuxtImports = fileURLToPath(new URL('./test/helpers/nuxt-imports.ts', import.meta.url))

// Nuxt replaces import.meta.client/server at build time; the runtime only opens IndexedDB on the client.
// Vite's `define` does not reach import.meta.* in the browser runner, so replace them in the runtime sources.
const nuxtImportMeta: Plugin = {
  name: 'nuxt-import-meta',
  transform(code, id) {
    if (!id.includes('/src/runtime/') || !code.includes('import.meta.')) return
    return code.replaceAll('import.meta.client', 'true').replaceAll('import.meta.server', 'false')
  },
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '#imports': nuxtImports },
  },
  test: {
    coverage: {
      provider: 'istanbul',
      include: ['src/runtime/**/*.ts'],
      exclude: ['src/runtime/types/**', 'src/**/*.d.ts'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
    },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        plugins: [vue(), nuxtImportMeta],
        resolve: {
          alias: { '#imports': nuxtImports },
        },
        test: {
          name: 'browser',
          include: ['test/browser/**/*.test.ts'],
          browser: {
            enabled: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['test/helpers/browser-setup.ts'],
        },
      },
    ],
  },
})
