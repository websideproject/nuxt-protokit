<script setup lang="ts">
// useProtoDoc + useProtoText — textarea backed by a Y.Text CRDT
const { doc, isReady } = useProtoDoc('playground-headless-notes', { disableSync: true })
const { text: notes } = useProtoText(doc, 'main-notes')

// Per-note tabs stored in a Y.Map via useProtoMap
const { state } = useProtoMap(doc, 'notes-meta', {
  activeTab: { type: 'select', label: 'Active tab', default: 'scratch' },
})

// Second note: a separate Y.Text per tab key
const { text: meetingNotes } = useProtoText(doc, 'meeting-notes')

const activeTab = state.activeTab

const currentText = computed({
  get: () => activeTab.value === 'scratch' ? notes.value : meetingNotes.value,
  set: (val: string) => {
    if (activeTab.value === 'scratch') notes.value = val
    else meetingNotes.value = val
  },
})

const charCount = computed(() => currentText.value.length)
const wordCount = computed(() => {
  const trimmed = currentText.value.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
})
const lineCount = computed(() => currentText.value.split('\n').length)

const tabs = [
  { key: 'scratch', label: 'Scratch pad', icon: 'i-lucide-pencil' },
  { key: 'meeting', label: 'Meeting notes', icon: 'i-lucide-users' },
]

const placeholders: Record<string, string> = {
  scratch: 'Start writing… everything is saved automatically.',
  meeting: 'Attendees:\n\nAgenda:\n\nAction items:\n',
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-8 space-y-6">
    <UAlert
      icon="i-lucide-file-text"
      color="info"
      variant="subtle"
      title="Headless notes — useProtoText"
      description="Each textarea is a Y.Text CRDT — persisted to IndexedDB, synced across tabs via BroadcastChannel. No ProtoTool, no schema, just a reactive string ref."
    />

    <ClientOnly>
      <template v-if="isReady">
        <UCard>
          <template #header>
            <!-- Tab switcher -->
            <div class="flex items-center gap-1">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                :class="activeTab.value === tab.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:text-highlighted hover:bg-muted/50'"
                @click="activeTab.value = tab.key"
              >
                <UIcon
                  :name="tab.icon"
                  class="size-3.5"
                />
                {{ tab.label }}
              </button>
            </div>
          </template>

          <!-- Textarea — plain v-model on the Y.Text ref -->
          <textarea
            v-model="currentText"
            class="w-full h-64 bg-transparent text-sm text-highlighted placeholder:text-muted resize-none outline-none font-mono leading-relaxed"
            :placeholder="placeholders[activeTab.value as string]"
          />

          <template #footer>
            <div class="flex items-center gap-4 text-xs text-muted">
              <span>{{ charCount }} chars</span>
              <span>{{ wordCount }} words</span>
              <span>{{ lineCount }} lines</span>
              <span class="ml-auto flex items-center gap-1">
                <UIcon
                  name="i-lucide-save"
                  class="size-3.5 text-success-500"
                />
                Saved automatically
              </span>
            </div>
          </template>
        </UCard>

        <!-- Show the raw Y.Text value to prove persistence -->
        <div class="rounded-xl border border-default overflow-hidden text-sm">
          <div class="flex items-center gap-2 px-4 py-2.5 border-b border-default bg-muted/30">
            <UIcon
              name="i-lucide-layers"
              class="size-3.5 text-muted"
            />
            <span class="text-xs text-muted font-medium">Y.Text keys in this document</span>
          </div>
          <div class="divide-y divide-default">
            <div
              v-for="tab in tabs"
              :key="tab.key"
              class="px-4 py-2.5 flex items-center gap-3"
            >
              <code class="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {{ tab.key === 'scratch' ? 'main-notes' : 'meeting-notes' }}
              </code>
              <span class="text-xs text-muted truncate">
                {{
                  (tab.key === 'scratch' ? notes.value : meetingNotes.value).slice(0, 60) || '(empty)'
                }}{{ (tab.key === 'scratch' ? notes.value : meetingNotes.value).length > 60 ? '…' : '' }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- Loading skeleton -->
      <template v-else>
        <div class="space-y-3 animate-pulse">
          <div class="h-10 bg-muted rounded-xl" />
          <div class="h-64 bg-muted rounded-xl" />
        </div>
      </template>

      <template #fallback>
        <div class="space-y-3 animate-pulse">
          <div class="h-10 bg-muted rounded-xl" />
          <div class="h-64 bg-muted rounded-xl" />
        </div>
      </template>
    </ClientOnly>

    <UAlert
      icon="i-lucide-lightbulb"
      color="neutral"
      variant="subtle"
      title="Try it"
      description="Open this page in two tabs side by side. Type in one — the other tab updates live via BroadcastChannel. Reload either tab — text is restored from IndexedDB. useProtoMap tracks the active tab across reloads too."
    />
  </div>
</template>
