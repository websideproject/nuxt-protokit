<template>
  <div class="max-w-2xl mx-auto px-8 py-14 space-y-10">
    <!-- Hero -->
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-layers" class="w-6 h-6 text-primary" />
        <UBadge color="primary" variant="subtle">v0.1.0</UBadge>
      </div>
      <h1 class="text-3xl font-bold text-highlighted">nuxt-protokit</h1>
      <p class="text-lg text-muted leading-relaxed">
        Schema-driven, offline-first tool builder for Nuxt. Define a TypeScript schema — get a fully functional,
        persisted, synced prototype with zero boilerplate.
      </p>
    </div>

    <!-- Features -->
    <div class="grid grid-cols-2 gap-3">
      <div
        v-for="feature in features"
        :key="feature.label"
        class="flex items-start gap-3 p-4 rounded-xl border border-default bg-elevated"
      >
        <UIcon :name="feature.icon" class="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p class="text-sm font-medium text-highlighted">{{ feature.label }}</p>
          <p class="text-xs text-muted mt-0.5">{{ feature.description }}</p>
        </div>
      </div>
    </div>

    <!-- Quick start -->
    <div class="space-y-3">
      <h2 class="text-base font-semibold text-highlighted">Quick start</h2>
      <div class="rounded-xl border border-default bg-elevated overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-2 border-b border-default bg-muted/30">
          <UIcon name="i-lucide-file-code" class="w-3.5 h-3.5 text-muted" />
          <span class="text-xs text-muted font-mono">my-tool.vue</span>
        </div>
        <pre class="px-4 py-4 text-xs text-muted overflow-x-auto leading-relaxed"><code><span class="text-highlighted">const</span> schema = <span class="text-primary">definePrototype</span>({
  key: <span class="text-emerald-500">'my-tool'</span>,
  fields: {
    revenue: { type: <span class="text-emerald-500">'number'</span>, label: <span class="text-emerald-500">'Monthly Revenue'</span>, default: <span class="text-amber-500">10000</span> },
  },
  derived: {
    annual: { compute: ({ fields }) => fields.revenue * <span class="text-amber-500">12</span> },
  },
  results: [{
    title: <span class="text-emerald-500">'Summary'</span>,
    stats: ({ derived }) => [{ label: <span class="text-emerald-500">'Annual Revenue'</span>, value: derived.annual }],
  }],
})

<span class="text-muted">// In template:</span>
<span class="text-primary">&lt;ProtoTool</span> :schema=<span class="text-emerald-500">"schema"</span> <span class="text-primary">/&gt;</span></code></pre>
      </div>
    </div>

    <p class="text-sm text-muted">
      Select an example from the sidebar to explore the capabilities.
    </p>
  </div>
</template>

<script setup lang="ts">
const features = [
  { icon: 'i-lucide-database', label: 'Offline-first', description: 'Y.js + IndexedDB — works without a server' },
  { icon: 'i-lucide-refresh-cw', label: 'Real-time sync', description: 'BroadcastChannel sync across tabs' },
  { icon: 'i-lucide-layout-dashboard', label: 'Flexible layout', description: 'Forms, stats, cards, charts — composable' },
  { icon: 'i-lucide-shield-check', label: 'Corruption recovery', description: 'Automatic detection and recovery modal' },
]
</script>
