<script setup lang="ts">
// useProtoDoc + useProtoList directly — no schema, no ProtoTool, no ProtoCrudList
const { doc, isReady } = useProtoDoc('playground-headless-tasks', { disableSync: true })

interface Task {
  id: string
  title: string
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  createdAt: number
}

const { items, add, update, remove, move, count } = useProtoList<Task>(doc, 'headless-tasks', {
  defaults: {
    id: '',
    title: '',
    status: 'todo',
    priority: 'medium',
    createdAt: 0,
  },
})

// Add form state
const newTitle = ref('')
const newPriority = ref<Task['priority']>('medium')
const editingIndex = ref<number | null>(null)
const editTitle = ref('')

function addTask() {
  const title = newTitle.value.trim()
  if (!title) return
  add({
    id: crypto.randomUUID(),
    title,
    status: 'todo',
    priority: newPriority.value,
    createdAt: Date.now(),
  })
  newTitle.value = ''
}

function cycleStatus(index: number) {
  const task = items.value[index]
  const next: Record<Task['status'], Task['status']> = {
    'todo': 'in-progress',
    'in-progress': 'done',
    'done': 'todo',
  }
  update(index, { status: next[task.status] })
}

function startEdit(index: number) {
  editingIndex.value = index
  editTitle.value = items.value[index].title
}

function commitEdit(index: number) {
  const title = editTitle.value.trim()
  if (title) update(index, { title })
  editingIndex.value = null
}

function cancelEdit() {
  editingIndex.value = null
}

const statusConfig: Record<Task['status'], { label: string, color: 'neutral' | 'warning' | 'success', icon: string }> = {
  'todo': { label: 'Todo', color: 'neutral', icon: 'i-lucide-circle' },
  'in-progress': { label: 'In progress', color: 'warning', icon: 'i-lucide-clock' },
  'done': { label: 'Done', color: 'success', icon: 'i-lucide-check-circle-2' },
}

const priorityConfig: Record<Task['priority'], { color: 'neutral' | 'warning' | 'error' }> = {
  low: { color: 'neutral' },
  medium: { color: 'warning' },
  high: { color: 'error' },
}

const stats = computed(() => ({
  total: count.value,
  todo: items.value.filter(t => t.status === 'todo').length,
  inProgress: items.value.filter(t => t.status === 'in-progress').length,
  done: items.value.filter(t => t.status === 'done').length,
}))
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-8 space-y-6">
    <UAlert
      icon="i-lucide-list-todo"
      color="info"
      variant="subtle"
      title="Headless task list"
      description="useProtoDoc + useProtoList directly — no ProtoTool, no ProtoCrudList. Fully custom UI with TypeScript-typed items, persisted to IndexedDB, synced across tabs."
    />

    <ClientOnly>
      <template v-if="isReady">
        <!-- Stats row -->
        <div class="grid grid-cols-4 gap-3">
          <div
            v-for="(val, label) in { 'Total': stats.total, 'Todo': stats.todo, 'In progress': stats.inProgress, 'Done': stats.done }"
            :key="label"
            class="rounded-xl border border-default bg-elevated px-4 py-3 text-center"
          >
            <p class="text-2xl font-bold text-highlighted">
              {{ val }}
            </p>
            <p class="text-xs text-muted mt-0.5">
              {{ label }}
            </p>
          </div>
        </div>

        <!-- Add task row -->
        <div class="flex gap-2">
          <UInput
            v-model="newTitle"
            placeholder="New task…"
            class="flex-1"
            @keydown.enter="addTask"
          />
          <USelect
            v-model="newPriority"
            :items="[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]"
            class="w-32"
          />
          <UButton
            icon="i-lucide-plus"
            :disabled="!newTitle.trim()"
            @click="addTask"
          >
            Add
          </UButton>
        </div>

        <!-- Task list -->
        <div
          v-if="items.length"
          class="rounded-xl border border-default divide-y divide-default overflow-hidden"
        >
          <div
            v-for="(task, index) in items"
            :key="task.id"
            class="flex items-center gap-3 px-4 py-3 bg-default hover:bg-muted/30 transition-colors"
            :class="{ 'opacity-50': task.status === 'done' }"
          >
            <!-- Status toggle -->
            <button
              class="shrink-0"
              :title="`Click to advance status (currently: ${task.status})`"
              @click="cycleStatus(index)"
            >
              <UIcon
                :name="statusConfig[task.status].icon"
                class="size-4.5"
                :class="{
                  'text-muted': task.status === 'todo',
                  'text-warning-500': task.status === 'in-progress',
                  'text-success-500': task.status === 'done',
                }"
              />
            </button>

            <!-- Title — editable inline -->
            <div class="flex-1 min-w-0">
              <template v-if="editingIndex === index">
                <UInput
                  v-model="editTitle"
                  size="sm"
                  autofocus
                  @keydown.enter="commitEdit(index)"
                  @keydown.escape="cancelEdit"
                  @blur="commitEdit(index)"
                />
              </template>
              <template v-else>
                <span
                  class="text-sm text-highlighted cursor-text select-none"
                  :class="{ 'line-through text-muted': task.status === 'done' }"
                  @dblclick="startEdit(index)"
                >{{ task.title }}</span>
              </template>
            </div>

            <!-- Priority badge -->
            <UBadge
              :color="priorityConfig[task.priority].color"
              variant="subtle"
              size="sm"
            >
              {{ task.priority }}
            </UBadge>

            <!-- Status badge -->
            <UBadge
              :color="statusConfig[task.status].color"
              variant="subtle"
              size="sm"
              class="hidden sm:flex"
            >
              {{ statusConfig[task.status].label }}
            </UBadge>

            <!-- Actions -->
            <div class="flex gap-1 shrink-0">
              <UButton
                icon="i-lucide-arrow-up"
                size="xs"
                variant="ghost"
                color="neutral"
                :disabled="index === 0"
                @click="move(index, index - 1)"
              />
              <UButton
                icon="i-lucide-arrow-down"
                size="xs"
                variant="ghost"
                color="neutral"
                :disabled="index === items.length - 1"
                @click="move(index, index + 1)"
              />
              <UButton
                icon="i-lucide-pencil"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="startEdit(index)"
              />
              <UButton
                icon="i-lucide-trash-2"
                size="xs"
                variant="ghost"
                color="error"
                @click="remove(index)"
              />
            </div>
          </div>
        </div>

        <div
          v-else
          class="rounded-xl border border-default border-dashed py-12 text-center"
        >
          <UIcon
            name="i-lucide-inbox"
            class="size-8 text-muted mx-auto mb-2"
          />
          <p class="text-sm text-muted">
            No tasks yet. Add one above.
          </p>
        </div>

        <p class="text-xs text-muted text-center">
          Double-click a task title to edit inline. Click the status icon to cycle through states.
        </p>
      </template>

      <!-- Loading skeleton -->
      <template v-else>
        <div class="space-y-2 animate-pulse">
          <div class="h-10 bg-muted rounded" />
          <div class="h-12 bg-muted rounded" />
          <div class="h-12 bg-muted rounded" />
        </div>
      </template>

      <template #fallback>
        <div class="space-y-2 animate-pulse">
          <div class="h-10 bg-muted rounded" />
          <div class="h-12 bg-muted rounded" />
        </div>
      </template>
    </ClientOnly>

    <UAlert
      icon="i-lucide-lightbulb"
      color="neutral"
      variant="subtle"
      title="How it works"
      description="useProtoList returns items (Ref<Task[]>), add, update, remove, move, and count. Items are TypeScript-typed, stored in a Y.Array, persisted to IndexedDB, and synced across tabs — with zero rendering from protokit."
    />
  </div>
</template>
