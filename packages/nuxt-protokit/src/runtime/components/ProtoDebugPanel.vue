<script setup lang="ts">
import { ref } from 'vue'
import { useProtoDebugInfo } from '../composables/useProtoDebugInfo'
import { useProtoKitConfig } from '../composables/useProtoKitConfig'

const { activeDocs: docs, getDocJson, refresh } = useProtoDebugInfo()
const { serverSync } = useProtoKitConfig()

const isOpen = ref(false)
const expandedDoc = ref<string | null>(null)
const copiedKey = ref<string | null>(null)

function toggleDoc(key: string) {
  expandedDoc.value = expandedDoc.value === key ? null : key
}

function copyJson(key: string) {
  const json = getDocJson(key)
  if (json) {
    navigator.clipboard.writeText(JSON.stringify(json, null, 2))
    copiedKey.value = key
    setTimeout(() => { copiedKey.value = null }, 1500)
  }
}

async function clearAllIndexedDB() {
  if (!confirm('Delete all Y.js IndexedDB data? This cannot be undone.')) return
  const dbs = await indexedDB.databases()
  for (const db of dbs) {
    if (db.name && (db.name.startsWith('proto:') || db.name.startsWith('projects:') || db.name.startsWith('idea:'))) {
      indexedDB.deleteDatabase(db.name)
    }
  }
  refresh()
}
</script>

<template>
  <!-- Fixed trigger tab — vertically centered on right viewport edge -->
  <button
    class="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-8 h-12 bg-elevated border border-r-0 border-default rounded-l-lg shadow-sm hover:bg-muted transition-colors"
    @click="isOpen = true"
  >
    <div class="relative">
      <UIcon
        name="i-lucide-bug"
        class="w-4 h-4 text-muted"
      />
      <span
        v-if="docs.length"
        class="absolute -top-1.5 -right-2.5 text-[9px] font-bold text-primary leading-none"
      >{{ docs.length }}</span>
    </div>
  </button>

  <!-- Slideover -->
  <USlideover
    v-model:open="isOpen"
    side="right"
    title="Y.js Debug"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #actions>
      <UBadge
        color="neutral"
        variant="subtle"
        size="xs"
        class="mr-1"
      >
        {{ docs.length }} doc{{ docs.length !== 1 ? 's' : '' }}
      </UBadge>
    </template>

    <template #body>
      <div
        v-if="docs.length === 0"
        class="text-center py-6 text-sm text-muted"
      >
        No active Y.js documents
      </div>

      <div class="space-y-2">
        <div
          v-for="doc in docs"
          :key="doc.fullDocKey"
          class="border border-default rounded-lg overflow-hidden"
        >
          <button
            class="w-full flex items-center gap-2 p-2 text-left hover:bg-muted transition-colors"
            @click="toggleDoc(doc.fullDocKey)"
          >
            <div
              class="w-2 h-2 rounded-full flex-shrink-0"
              :class="doc.isReady ? 'bg-success' : 'bg-error'"
            />
            <div class="flex-1 min-w-0">
              <div class="text-xs font-mono text-highlighted truncate">
                {{ doc.docKey }}
              </div>
              <div class="text-xs text-muted">
                {{ doc.docType }}
              </div>
            </div>
            <UBadge
              color="neutral"
              variant="subtle"
              size="xs"
            >
              {{ doc.refCount }}
            </UBadge>
            <UIcon
              :name="expandedDoc === doc.fullDocKey ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="w-3.5 h-3.5 text-muted flex-shrink-0"
            />
          </button>

          <div
            v-if="expandedDoc === doc.fullDocKey"
            class="border-t border-default p-2 space-y-2"
          >
            <div class="flex flex-wrap gap-1">
              <UBadge
                :color="doc.hasIndexedDB ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              >
                IndexedDB
              </UBadge>
              <UBadge
                :color="doc.hasBroadcast ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              >
                Broadcast
              </UBadge>
              <UBadge
                :color="serverSync.enabled ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              >
                Cloud
              </UBadge>
            </div>
            <div class="relative">
              <button
                class="absolute top-1 right-1 flex items-center justify-center p-1.5 rounded hover:bg-accented transition-colors"
                @click.stop="copyJson(doc.fullDocKey)"
              >
                <UIcon
                  :name="copiedKey === doc.fullDocKey ? 'i-lucide-check' : 'i-lucide-copy'"
                  class="w-3.5 h-3.5 text-muted"
                />
              </button>
              <pre class="text-xs font-mono bg-muted rounded p-2 overflow-auto max-h-96 text-highlighted">{{ JSON.stringify(getDocJson(doc.fullDocKey), null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 w-full">
        <UButton
          icon="i-lucide-refresh-cw"
          label="Refresh"
          variant="soft"
          color="neutral"
          size="xs"
          class="flex-1"
          @click="refresh()"
        />
        <UButton
          icon="i-lucide-trash-2"
          label="Clear All IndexedDB"
          variant="soft"
          color="error"
          size="xs"
          class="flex-1"
          @click="clearAllIndexedDB()"
        />
      </div>
    </template>
  </USlideover>
</template>
