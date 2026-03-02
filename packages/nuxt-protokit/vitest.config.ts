import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  plugins: [vue()],
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
        plugins: [vue()],
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
