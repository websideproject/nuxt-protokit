<script setup lang="ts">
// defineHeadlessSchema — only key + fields required, no visual-only fields
const settingsSchema = defineHeadlessSchema({
  key: 'playground-app-settings',
  fields: {
    theme: {
      type: 'select',
      label: 'Theme',
      default: 'system',
      options: [
        { value: 'system', label: 'System' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ],
    },
    language: {
      type: 'select',
      label: 'Language',
      default: 'en',
      options: [
        { value: 'en', label: 'English' },
        { value: 'de', label: 'Deutsch' },
        { value: 'fr', label: 'Français' },
        { value: 'es', label: 'Español' },
      ],
    },
    compactMode: {
      type: 'toggle',
      label: 'Compact mode',
      default: false,
    },
    notifications: {
      type: 'toggle',
      label: 'Notifications',
      default: true,
    },
    itemsPerPage: {
      type: 'number',
      label: 'Items per page',
      default: 25,
    },
    accentColor: {
      type: 'select',
      label: 'Accent color',
      default: 'primary',
      options: [
        { value: 'primary', label: 'Indigo' },
        { value: 'sky', label: 'Sky' },
        { value: 'emerald', label: 'Emerald' },
        { value: 'rose', label: 'Rose' },
      ],
    },
  },
})

// disableSync: true — stays on device, no server involved
const { state, isReady, reset } = usePrototype(settingsSchema, {
  disableSync: true,
})

const showRaw = ref(false)
const rawState = computed(() => {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(state)) {
    out[k] = v.value
  }
  return out
})
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-8 space-y-6">
    <UAlert
      icon="i-lucide-box"
      color="info"
      variant="subtle"
      title="Headless settings store"
      description="No ProtoForm or ProtoTool — just defineHeadlessSchema + usePrototype bound to plain Nuxt UI controls. Settings persist to IndexedDB and sync across tabs automatically."
    />

    <ClientOnly>
      <template v-if="isReady">
        <!-- Settings form — fully custom UI -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold">App Settings</span>
              <UButton
                variant="ghost"
                size="xs"
                icon="i-lucide-rotate-ccw"
                color="neutral"
                @click="reset"
              >
                Reset
              </UButton>
            </div>
          </template>

          <div class="space-y-5">
            <!-- Theme + Language row -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-highlighted">Theme</label>
                <USelect
                  v-model="state.theme.value"
                  :items="[
                    { value: 'system', label: 'System' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-highlighted">Language</label>
                <USelect
                  v-model="state.language.value"
                  :items="[
                    { value: 'en', label: 'English' },
                    { value: 'de', label: 'Deutsch' },
                    { value: 'fr', label: 'Français' },
                    { value: 'es', label: 'Español' },
                  ]"
                />
              </div>
            </div>

            <!-- Accent color -->
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-highlighted">Accent color</label>
              <div class="flex gap-2">
                <UButton
                  v-for="opt in [
                    { value: 'primary', label: 'Indigo', color: 'primary' },
                    { value: 'sky', label: 'Sky', color: 'sky' },
                    { value: 'emerald', label: 'Emerald', color: 'success' },
                    { value: 'rose', label: 'Rose', color: 'error' },
                  ]"
                  :key="opt.value"
                  :variant="state.accentColor.value === opt.value ? 'solid' : 'outline'"
                  :color="(opt.color as any)"
                  size="sm"
                  @click="state.accentColor.value = opt.value"
                >
                  {{ opt.label }}
                </UButton>
              </div>
            </div>

            <!-- Items per page -->
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-highlighted">Items per page</label>
              <UInput
                v-model.number="state.itemsPerPage.value"
                type="number"
                :min="5"
                :max="200"
                class="w-32"
              />
            </div>

            <!-- Toggles -->
            <div class="space-y-3 pt-1">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-highlighted">
                    Compact mode
                  </p>
                  <p class="text-xs text-muted">
                    Reduce padding and font sizes
                  </p>
                </div>
                <UToggle v-model="state.compactMode.value" />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-highlighted">
                    Notifications
                  </p>
                  <p class="text-xs text-muted">
                    Receive in-app notifications
                  </p>
                </div>
                <UToggle v-model="state.notifications.value" />
              </div>
            </div>
          </div>

          <template #footer>
            <p class="text-xs text-muted">
              All changes are persisted to IndexedDB instantly. Reload the page — settings are still here.
            </p>
          </template>
        </UCard>

        <!-- Raw state inspector -->
        <div class="rounded-xl border border-default overflow-hidden text-sm">
          <button
            class="w-full flex items-center gap-2 px-4 py-2.5 border-b border-default bg-muted/30 text-left hover:bg-muted/50 transition-colors"
            @click="showRaw = !showRaw"
          >
            <UIcon
              name="i-lucide-code-2"
              class="size-3.5 text-muted"
            />
            <span class="text-xs text-muted font-medium">Live Y.js state</span>
            <UIcon
              :name="showRaw ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-3.5 text-muted ml-auto"
            />
          </button>
          <pre
            v-if="showRaw"
            class="px-4 py-3 text-xs text-muted overflow-x-auto leading-relaxed"
          >{{ JSON.stringify(rawState, null, 2) }}</pre>
        </div>
      </template>

      <!-- Loading skeleton -->
      <template v-else>
        <div class="space-y-3 animate-pulse">
          <div class="h-10 bg-muted rounded-xl" />
          <div class="h-48 bg-muted rounded-xl" />
        </div>
      </template>

      <template #fallback>
        <div class="space-y-3 animate-pulse">
          <div class="h-10 bg-muted rounded-xl" />
          <div class="h-48 bg-muted rounded-xl" />
        </div>
      </template>
    </ClientOnly>

    <UAlert
      icon="i-lucide-lightbulb"
      color="neutral"
      variant="subtle"
      title="How it works"
      description="defineHeadlessSchema skips title/icon/description — the visual-only PrototypeSchema fields. usePrototype returns plain Vue Refs that you bind directly to any input. disableSync: true keeps everything local."
    />
  </div>
</template>
