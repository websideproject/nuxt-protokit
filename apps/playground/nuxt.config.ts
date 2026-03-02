export default defineNuxtConfig({
  modules: ['@websideproject/nuxt-protokit', '@nuxt/ui'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  protokit: {
    serverSync: false,
  },
})
