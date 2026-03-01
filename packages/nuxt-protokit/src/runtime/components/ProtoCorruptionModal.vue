<script setup lang="ts">
const { corruptionQueue, resolveCorruption } = useProtoCorruption()

// Show the first queued event — processed one at a time
const current = computed(() => corruptionQueue.value[0] ?? null)

// Plain ref so UModal's internal state never desyncs from our intent.
// A computed with a no-op setter breaks UModal: the component sets its internal
// state to "closed" before emitting update:open, causing a permanent desync.
const isOpen = ref(false)

watch(
  () => corruptionQueue.value.length,
  (len) => { isOpen.value = len > 0 },
  { immediate: true },
)

// Called when UModal wants to close (ESC, overlay click, or the X button we've hidden).
// Re-open on the next tick so the user is forced to make a choice.
function handleOpenChange(val: boolean) {
  if (!val && corruptionQueue.value.length > 0) {
    nextTick(() => { isOpen.value = true })
  }
}

const snapshotAgeDisplay = computed(() => {
  const age = current.value?.latestSnapshotAge
  if (age == null) return 'unknown time ago'
  const minutes = Math.floor(age / 60_000)
  if (minutes < 1) return 'less than a minute ago'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
})

const hasBackup = computed(() => !!current.value?.latestSnapshotId)

function resolve(action: 'restore' | 'fresh') {
  if (!current.value) return
  // Empty the queue first so handleOpenChange sees length=0 and won't reopen.
  resolveCorruption(current.value.id, action)
  // Set isOpen synchronously — don't wait for the watcher's async flush.
  // The watcher will also fire (as a no-op) on the next tick.
  isOpen.value = false
}
</script>

<template>
  <UModal :open="isOpen" title="Data Recovery Needed" :close="false" :ui="{ content: 'max-w-md' }" @update:open="handleOpenChange">
    <template #body>
      <div class="space-y-4">
        <!-- Icon + intro -->
        <div class="flex gap-3 items-start">
          <div class="w-10 h-10 rounded-full bg-warning/10 flex-shrink-0 flex items-center justify-center">
            <UIcon name="i-lucide-database-zap" class="w-5 h-5 text-warning" />
          </div>
          <div class="space-y-1">
            <p class="text-sm text-highlighted">
              Stored data for
              <code class="px-1 py-0.5 rounded bg-muted text-xs font-mono">{{ current?.displayName }}</code>
              could not be loaded — the local database appears to be corrupt.
            </p>
            <p class="text-xs text-muted">This can happen after interrupted writes or browser crashes.</p>
          </div>
        </div>

        <!-- Server backup available -->
        <div
          v-if="hasBackup"
          class="flex items-start gap-2 p-3 rounded-lg border border-success/30 bg-success/5"
        >
          <UIcon name="i-lucide-history" class="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
          <div>
            <p class="text-sm font-medium text-success">Server backup found</p>
            <p class="text-xs text-muted">
              {{ current?.latestSnapshotLabel ? `"${current.latestSnapshotLabel}" — ` : '' }}Saved {{ snapshotAgeDisplay }}. Restoring will recover your data from the server.
            </p>
          </div>
        </div>

        <!-- No backup -->
        <div
          v-else
          class="flex items-start gap-2 p-3 rounded-lg border border-error/30 bg-error/5"
        >
          <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 text-error mt-0.5 flex-shrink-0" />
          <div>
            <p class="text-sm font-medium text-error">No server backup available</p>
            <p class="text-xs text-muted">Starting fresh will clear the corrupt data. Future changes will be backed up to the server automatically.</p>
          </div>
        </div>

        <!-- Queue indicator -->
        <p v-if="corruptionQueue.length > 1" class="text-xs text-muted text-right">
          {{ corruptionQueue.length - 1 }} more item{{ corruptionQueue.length > 2 ? 's' : '' }} to resolve
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 flex-wrap">
        <UButton
          v-if="hasBackup"
          color="primary"
          icon="i-lucide-history"
          @click="resolve('restore')"
        >
          Restore from server backup
        </UButton>
        <UButton
          :color="hasBackup ? 'neutral' : 'error'"
          :variant="hasBackup ? 'outline' : 'solid'"
          icon="i-lucide-trash-2"
          @click="resolve('fresh')"
        >
          {{ hasBackup ? 'Start fresh' : 'Start fresh (data will be lost)' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
