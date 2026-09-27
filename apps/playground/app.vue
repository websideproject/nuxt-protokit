<script setup lang="ts">
useHead({
  link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  htmlAttrs: { lang: 'en' },
})

useSeoMeta({
  title: 'nuxt-protokit playground',
  description: 'Schema-driven prototypes for Nuxt 4: calculators, collections, calendar, charts, panels and headless stores, saved to IndexedDB.',
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Mounted once for the whole app: asks what to do when a stored document is corrupt -->
    <ProtoCorruptionModal />
  </UApp>
</template>
