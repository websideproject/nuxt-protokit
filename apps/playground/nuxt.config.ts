export default defineNuxtConfig({
  modules: ['@websideproject/nuxt-protokit', '@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  protokit: {
    serverSync: false,
  },
})
