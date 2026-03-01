<script setup lang="ts">
const navItems = [
  [
    { type: 'label', label: 'Calculators' },
    { label: 'Break-Even', to: '/break-even', icon: 'i-lucide-target' },
    { label: 'Resource Estimator', to: '/resource-estimator', icon: 'i-lucide-calculator' },
    { label: 'Personal Runway', to: '/runway', icon: 'i-lucide-plane-takeoff' },
    { label: 'SaaS Dashboard', to: '/saas-dashboard', icon: 'i-lucide-layout-dashboard' },
  ],
  [
    { type: 'label', label: 'Collections' },
    { label: 'Competitor Tracker', to: '/competitors', icon: 'i-lucide-users' },
  ],
  [
    { type: 'label', label: 'Features' },
    { label: 'Real-time Sync', to: '/tab-sync', icon: 'i-lucide-refresh-cw' },
    { label: 'Bricks Gallery', to: '/bricks-gallery', icon: 'i-lucide-blocks' },
    { label: 'Corruption Recovery', to: '/corruption-recovery', icon: 'i-lucide-database-zap' },
  ],
]
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-default">
    <!-- Sidebar -->
    <aside class="w-60 shrink-0 flex flex-col border-r border-default bg-elevated">
      <!-- Brand -->
      <NuxtLink
        to="/"
        class="h-14 px-4 flex items-center gap-2.5 border-b border-default hover:bg-muted/50 transition-colors"
      >
        <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 shrink-0">
          <UIcon name="i-lucide-layers" class="w-4 h-4 text-primary" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-highlighted leading-tight truncate">nuxt-protokit</p>
          <p class="text-xs text-muted leading-tight">playground</p>
        </div>
      </NuxtLink>

      <!-- Navigation -->
      <div class="flex-1 overflow-y-auto py-3 px-2">
        <UNavigationMenu
          orientation="vertical"
          :items="navItems"
          :highlight="true"
          :ui="{ root: 'w-full gap-3' }"
        />
      </div>

      <!-- Footer -->
      <div class="px-3 py-3 border-t border-default">
        <p class="text-xs text-muted truncate text-center">@websideproject/nuxt-protokit</p>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-y-auto">
      <slot />
    </main>
  </div>
</template>
