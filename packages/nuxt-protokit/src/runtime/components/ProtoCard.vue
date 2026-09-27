<script setup>
defineProps({
  title: { type: String, required: true },
  icon: { type: String, required: false },
  description: { type: String, required: false },
  stats: { type: Array, required: false },
  badge: { type: [Object, null], required: false },
  footer: { type: String, required: false },
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            v-if="icon"
            :name="icon"
            class="size-5"
          />
          <h3 class="font-semibold">
            {{ title }}
          </h3>
        </div>
        <UBadge
          v-if="badge"
          :color="badge.color"
          variant="subtle"
        >
          {{ badge.label }}
        </UBadge>
      </div>
      <p
        v-if="description"
        class="text-sm text-muted mt-1"
      >
        {{ description }}
      </p>
    </template>

    <slot>
      <div
        v-if="stats && stats.length"
        class="grid grid-cols-2 gap-3"
      >
        <div
          v-for="(stat, i) in stats"
          :key="i"
          class="text-center p-2 rounded-lg bg-muted"
        >
          <div
            class="font-bold text-lg"
            :class="stat.valueClass || 'text-highlighted'"
          >
            {{ stat.value }}
          </div>
          <div class="text-xs text-muted">
            {{ stat.label }}
          </div>
        </div>
      </div>
    </slot>

    <template
      v-if="footer"
      #footer
    >
      <p class="text-sm text-muted">
        {{ footer }}
      </p>
    </template>
  </UCard>
</template>
