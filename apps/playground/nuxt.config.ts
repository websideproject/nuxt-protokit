export default defineNuxtConfig({
  modules: ['@websideproject/nuxt-protokit', '@nuxt/ui'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  vite: {
    define: {
      // Report every hydration mismatch in production builds too (attributes and classes are otherwise not
      // checked): a mismatched page renders differently run to run.
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true',
    },
  },
  // Public Sans comes from public/fonts (see assets/css/main.css), not from a download at build time: Google Fonts
  // does not always serve the same file, and a different file shifts the glyphs in every screenshot.
  fonts: {
    families: [{ name: 'Public Sans', provider: 'none' }],
  },
  protokit: {
    serverSync: false,
  },
})
