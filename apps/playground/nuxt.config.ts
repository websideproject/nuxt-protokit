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
  protokit: {
    serverSync: false,
  },
})
