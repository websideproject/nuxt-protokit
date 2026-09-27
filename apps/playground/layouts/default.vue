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
    { type: 'label', label: 'Components' },
    { label: 'Calendar', to: '/calendar', icon: 'i-lucide-calendar' },
    { label: 'Calendar + Tasks', to: '/calendar-tasks', icon: 'i-lucide-calendar-check' },
    { label: 'Charts & Analytics', to: '/charts', icon: 'i-lucide-chart-line' },
    { label: 'Item Panels', to: '/item-panels', icon: 'i-lucide-layout-panel-left' },
  ],
  [
    { type: 'label', label: 'Features' },
    { label: 'Real-time Sync', to: '/tab-sync', icon: 'i-lucide-refresh-cw' },
    { label: 'Bricks Gallery', to: '/bricks-gallery', icon: 'i-lucide-blocks' },
    { label: 'Corruption Recovery', to: '/corruption-recovery', icon: 'i-lucide-database-zap' },
    { label: 'Custom Extensions', to: '/custom-extensions', icon: 'i-lucide-puzzle' },
    { label: 'Schema Migration', to: '/schema-migration', icon: 'i-lucide-arrow-up-circle' },
    { label: 'Permissions', to: '/permissions', icon: 'i-lucide-shield' },
  ],
  [
    { type: 'label', label: 'Headless Mode' },
    { label: 'Settings Store', to: '/headless-settings', icon: 'i-lucide-sliders-horizontal' },
    { label: 'Custom Task List', to: '/headless-tasks', icon: 'i-lucide-list-todo' },
    { label: 'Notes (useProtoText)', to: '/headless-notes', icon: 'i-lucide-file-text' },
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
        <ProductLogo class="size-8" />
        <div class="min-w-0">
          <p class="text-sm font-semibold text-highlighted leading-tight truncate">
            nuxt-protokit
          </p>
          <p class="text-xs text-muted leading-tight">
            by <ColourfulText class="font-semibold" />
          </p>
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
      <div class="px-3 py-2 border-t border-default flex items-center justify-between gap-2">
        <p class="text-xs text-muted truncate">
          by <ColourfulText class="font-semibold" />
        </p>
        <div class="flex items-center">
          <UColorModeButton size="xs" />
          <UButton
            to="https://github.com/websideproject/nuxt-protokit"
            target="_blank"
            icon="i-simple-icons-github"
            aria-label="GitHub"
            color="neutral"
            variant="ghost"
            size="xs"
          />
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-y-auto">
      <slot />
    </main>
  </div>
</template>
