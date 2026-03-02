<script setup lang="ts">
import type { CollectionSchema } from '#protokit/types'

const LEGACY_STORAGE_KEY = 'migration-demo-legacy-snapshot'

/**
 * Migration history:
 *   v0 → v1: renamed `done` (boolean) → `status` ('open' | 'done')
 *   v1 → v2: split `assignee` (string) → `assigneeId` + `assigneeName`
 */
const schema: CollectionSchema = {
  key: 'playground-tasks',
  title: 'Tasks',
  icon: 'i-lucide-check-square',
  itemLabel: item => String(item.title || 'Untitled'),
  listDisplay: {
    primaryField: 'title',
    secondaryField: 'assigneeName',
    badgeField: 'status',
  },
  fields: {
    title: { type: 'text', label: 'Title', default: '', placeholder: 'Task title' },
    status: {
      type: 'select',
      label: 'Status',
      default: 'open',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'done', label: 'Done' },
        { value: 'archived', label: 'Archived' },
      ],
    },
    assigneeId: { type: 'text', label: 'Assignee ID', default: '' },
    assigneeName: { type: 'text', label: 'Assignee Name', default: '' },
    priority: { type: 'segmented', label: 'Priority', default: 'medium', options: ['low', 'medium', 'high'] },
  },
  defaults: {
    title: '',
    status: 'open',
    assigneeId: '',
    assigneeName: '',
    priority: 'medium',
  },
  version: 2,
  migrations: {
    // v0 → v1: done:boolean → status:string (removes done)
    1: ({ done, ...rest }) => ({
      ...rest,
      status: done ? 'done' : 'open',
    }),
    // v1 → v2: assignee:string → assigneeId + assigneeName (removes assignee)
    2: ({ assignee, ...rest }) => ({
      ...rest,
      assigneeId: assignee ? assignee.toLowerCase().replace(/\s+/g, '-') : '',
      assigneeName: assignee ?? '',
    }),
  },
}

const { doc, items, add, update, remove, isReady } = useProtoCollection(schema)

// ── Seed legacy data ──────────────────────────────────────────────────────────
// Writes v0-format items directly into Y.Array and resets the stored version,
// so the next page load triggers the full migration chain (v0 → v1 → v2).

const seeded = ref(false)
const legacySnapshot = ref<unknown[] | null>(null)

onMounted(() => {
  const stored = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (stored) legacySnapshot.value = JSON.parse(stored)
})

function seedLegacyData() {
  const dataArray = doc.getArray(`playground-tasks`)
  const metaMap = doc.getMap(`playground-tasks:__meta__`)

  const legacyItems = [
    { id: 1, title: 'Design the onboarding flow', done: true, assignee: 'Alice Chen' },
    { id: 2, title: 'Fix login redirect bug', done: false, assignee: 'Bob Smith' },
    { id: 3, title: 'Write API docs', done: false, assignee: 'Alice Chen' },
  ]

  doc.transact(() => {
    dataArray.delete(0, dataArray.length)
    dataArray.insert(0, legacyItems as never[])
    metaMap.set('v', 0) // reset stored version to force migration on reload
  })

  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyItems, null, 2))
  seeded.value = true
}

function reloadPage() {
  window.location.reload()
}

function resetDemo() {
  const dataArray = doc.getArray(`playground-tasks`)
  const metaMap = doc.getMap(`playground-tasks:__meta__`)
  doc.transact(() => {
    dataArray.delete(0, dataArray.length)
    metaMap.delete('v')
  })
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  window.location.reload()
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-8 space-y-8">
    <!-- Header -->
    <div>
      <h1 class="text-xl font-bold text-highlighted">
        Schema Migration Demo
      </h1>
      <p class="text-sm text-muted mt-1">
        Demonstrates how <code class="text-xs bg-muted px-1 py-0.5 rounded">version</code> +
        <code class="text-xs bg-muted px-1 py-0.5 rounded">migrations</code> handle
        breaking schema changes across multiple versions.
      </p>
    </div>

    <!-- Migration map -->
    <div class="rounded-xl border border-default bg-elevated overflow-hidden text-sm">
      <div class="flex items-center gap-2 px-4 py-2.5 border-b border-default bg-muted/30">
        <UIcon
          name="i-lucide-git-branch"
          class="size-3.5 text-muted"
        />
        <span class="text-xs text-muted font-medium">Migration history</span>
      </div>
      <div class="divide-y divide-default">
        <div class="px-4 py-2.5 flex items-start gap-3">
          <UBadge
            size="sm"
            color="neutral"
            variant="subtle"
          >
            v0
          </UBadge>
          <span class="text-muted text-xs mt-0.5">
            Original shape: <code class="bg-muted px-1 rounded">done: boolean</code>,
            <code class="bg-muted px-1 rounded">assignee: string</code>
          </span>
        </div>
        <div class="px-4 py-2.5 flex items-start gap-3">
          <UBadge
            size="sm"
            color="warning"
            variant="subtle"
          >
            v1
          </UBadge>
          <span class="text-muted text-xs mt-0.5">
            <code class="bg-muted px-1 rounded">done</code> →
            <code class="bg-muted px-1 rounded">status: 'open' | 'done'</code>
          </span>
        </div>
        <div class="px-4 py-2.5 flex items-start gap-3">
          <UBadge
            size="sm"
            color="success"
            variant="subtle"
          >
            v2 (current)
          </UBadge>
          <span class="text-muted text-xs mt-0.5">
            <code class="bg-muted px-1 rounded">assignee</code> →
            <code class="bg-muted px-1 rounded">assigneeId</code> +
            <code class="bg-muted px-1 rounded">assigneeName</code>
          </span>
        </div>
      </div>
    </div>

    <!-- Seed controls -->
    <div class="rounded-xl border border-default p-4 space-y-3">
      <p class="text-sm font-medium text-highlighted">
        Simulate legacy data
      </p>
      <p class="text-xs text-muted leading-relaxed">
        Click <strong>Seed v0 data</strong> to write 3 items in the original v0 format directly
        into Y.js and reset the stored version to 0. Then reload — the migration chain
        (v0 → v1 → v2) runs automatically on startup and the items appear in the current schema.
      </p>
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-database"
          variant="outline"
          size="sm"
          :disabled="seeded"
          @click="seedLegacyData"
        >
          Seed v0 data
        </UButton>
        <UButton
          v-if="seeded"
          icon="i-lucide-refresh-cw"
          size="sm"
          @click="reloadPage"
        >
          Reload to migrate
        </UButton>
        <UButton
          icon="i-lucide-rotate-ccw"
          variant="ghost"
          size="sm"
          color="neutral"
          @click="resetDemo"
        >
          Reset
        </UButton>
        <span
          v-if="seeded"
          class="text-xs text-warning flex items-center gap-1"
        >
          <UIcon
            name="i-lucide-triangle-alert"
            class="size-3.5"
          />
          3 legacy items written — reload to trigger migration
        </span>
      </div>
    </div>

    <!-- Raw JSON comparison — only shown after reload, when migration has actually run -->
    <ClientOnly>
      <div
        v-if="legacySnapshot && !seeded"
        class="grid grid-cols-2 gap-4"
      >
        <!-- Before migration -->
        <div class="rounded-xl border border-default overflow-hidden text-sm">
          <div class="flex items-center gap-2 px-4 py-2.5 border-b border-default bg-muted/30">
            <UBadge
              size="sm"
              color="warning"
              variant="subtle"
            >
              v0
            </UBadge>
            <span class="text-xs text-muted font-medium">Before migration</span>
          </div>
          <pre class="px-4 py-3 text-xs text-muted overflow-x-auto leading-relaxed">{{ JSON.stringify(legacySnapshot, null, 2) }}</pre>
        </div>

        <!-- After migration -->
        <div class="rounded-xl border border-default overflow-hidden text-sm">
          <div class="flex items-center gap-2 px-4 py-2.5 border-b border-default bg-muted/30">
            <UBadge
              size="sm"
              color="success"
              variant="subtle"
            >
              v2
            </UBadge>
            <span class="text-xs text-muted font-medium">After migration</span>
          </div>
          <pre class="px-4 py-3 text-xs text-muted overflow-x-auto leading-relaxed">{{ JSON.stringify(items, null, 2) }}</pre>
        </div>
      </div>
    </ClientOnly>

    <!-- Live collection -->
    <ClientOnly>
      <div v-if="isReady">
        <ProtoCrudList
          :schema="schema"
          :items="items"
          :doc="doc"
          @add="add"
          @update="(i, item) => update(i, item)"
          @remove="remove"
        />
      </div>
      <div
        v-else
        class="space-y-2 animate-pulse"
      >
        <div class="h-10 bg-muted rounded" />
        <div class="h-12 bg-muted rounded" />
      </div>
      <template #fallback>
        <div class="space-y-2 animate-pulse">
          <div class="h-10 bg-muted rounded" />
          <div class="h-12 bg-muted rounded" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
