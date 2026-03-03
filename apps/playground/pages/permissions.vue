<script setup lang="ts">
import type { PrototypeSchema } from '#protokit/types'

// ── Role simulation ───────────────────────────────────────────────────────────
const roles = ['admin', 'editor', 'viewer', 'guest'] as const
type Role = typeof roles[number]

const currentRole = ref<Role>('viewer')

configureProtoPermissions({
  resolveRoles: () => [currentRole.value],
})

// ── Schema ────────────────────────────────────────────────────────────────────
const schema: PrototypeSchema = {
  key: 'playground-permissions',
  title: 'Project Board',
  shortTitle: 'Permissions',
  description: 'Role-based permission guards demo.',
  icon: 'i-lucide-shield',

  fields: {
    projectName: {
      type: 'text',
      label: 'Project Name',
      default: 'Acme Website Redesign',
    },
    status: {
      type: 'select',
      label: 'Status',
      default: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' },
        { label: 'Completed', value: 'completed' },
      ],
      permissions: {
        write: ['admin', 'editor'],
      },
    },
    budget: {
      type: 'number',
      label: 'Budget ($)',
      default: 50000,
      permissions: {
        read: 'admin',
        write: 'admin',
      },
    },
    internalNotes: {
      type: 'textarea',
      label: 'Internal Notes',
      default: '',
      placeholder: 'Notes only visible to admins and editors…',
      permissions: {
        read: ['admin', 'editor'],
        write: ['admin', 'editor'],
      },
    },
  },

  collections: {
    tasks: {
      key: 'tasks',
      title: 'Tasks',
      itemLabel: item => String(item.title || 'Untitled'),
      fields: {
        title: { type: 'text', label: 'Task', default: '' },
        done: { type: 'toggle', label: 'Done', default: false },
      },
      defaults: { title: '', done: false },
      permissions: {
        read: ['admin', 'editor', 'viewer'],
        create: ['admin', 'editor'],
        update: ['admin', 'editor'],
        delete: 'admin',
      },
    },
  },
}

// ── Composable ────────────────────────────────────────────────────────────────
const { state, collections, fieldPermissions, collectionPermissions, isReady }
  = usePrototype(schema, { disableSync: true })

// ── Business logic layer ──────────────────────────────────────────────────────
// `collectionPermissions.tasks` checks only whether the user's *role* allows
// the action. The business logic layer wraps each flag with an additional
// project-status check using Vue's computed().
//
// The two concerns stay separate and compose cleanly:
//   role check  →  collectionPermissions.tasks.canUpdate.value
//   status check → state.status.value === 'active'
//   effective    →  taskPerms.canUpdate.value  (both must be true)

const roleTaskPerms = collectionPermissions.tasks

const taskPerms = {
  canRead: roleTaskPerms.canRead,
  // New tasks cannot be added once the project is completed
  canCreate: computed(() => roleTaskPerms.canCreate.value && state.status.value !== 'completed'),
  // Tasks can only be checked/unchecked while the project is active
  canUpdate: computed(() => roleTaskPerms.canUpdate.value && state.status.value === 'active'),
  // Deletion is also frozen when paused or completed
  canDelete: computed(() => roleTaskPerms.canDelete.value && state.status.value === 'active'),
}

// Reason string when tasks are locked by status (role is sufficient but status blocks)
const statusLockReason = computed<string | null>(() => {
  if (state.status.value === 'completed') return 'Project completed — tasks are frozen'
  if (state.status.value === 'paused') return 'Project paused — tasks are read-only'
  return null
})

const tasks = collections.tasks
const newTaskTitle = ref('')

function addTask() {
  if (!newTaskTitle.value.trim()) return
  tasks.add({ title: newTaskTitle.value.trim(), done: false })
  newTaskTitle.value = ''
}

// ── Display helpers ───────────────────────────────────────────────────────────
const roleColors: Record<Role, 'error' | 'warning' | 'info' | 'neutral'> = {
  admin: 'error',
  editor: 'warning',
  viewer: 'info',
  guest: 'neutral',
}

const roleDescriptions: Record<Role, string> = {
  admin: 'Full access — sees all fields, can edit everything and delete tasks',
  editor: 'Can edit most fields and manage tasks, but no budget access',
  viewer: 'Read-only — sees project info and tasks, but cannot modify anything',
  guest: 'No access — collection and restricted fields are hidden',
}

// Describes why a task permission is denied — role, status, or both
function permReason(
  roleAllowed: boolean,
  effectiveAllowed: boolean,
): { label: string, color: 'success' | 'warning' | 'error' | 'neutral' } {
  if (effectiveAllowed) return { label: 'allowed', color: 'success' }
  if (!roleAllowed) return { label: 'denied · role', color: 'error' }
  return { label: 'denied · status', color: 'warning' }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-8 space-y-6">
    <!-- Info banner -->
    <div class="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <UIcon
        name="i-lucide-shield"
        class="size-4 text-primary mt-0.5 shrink-0"
      />
      <div class="text-sm text-muted leading-relaxed">
        Combines <strong class="text-highlighted">role-based guards</strong> (from the schema) with
        <strong class="text-highlighted">business logic</strong> (project status) using Vue computed().
        Switch roles and change the project status to see both layers interact.
      </div>
    </div>

    <!-- Role switcher -->
    <div class="rounded-xl border border-default bg-elevated p-4 space-y-3">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-user-circle"
          class="size-4 text-muted"
        />
        <span class="text-sm font-medium text-highlighted">Simulated role</span>
        <UBadge
          :label="currentRole"
          :color="roleColors[currentRole]"
          variant="subtle"
          size="xs"
        />
      </div>
      <div class="flex gap-2">
        <UButton
          v-for="role in roles"
          :key="role"
          :label="role"
          size="sm"
          :variant="currentRole === role ? 'solid' : 'outline'"
          :color="currentRole === role ? roleColors[role] : 'neutral'"
          @click="currentRole = role"
        />
      </div>
      <p class="text-xs text-muted">
        {{ roleDescriptions[currentRole] }}
      </p>
    </div>

    <ClientOnly>
      <template v-if="isReady">
        <!-- Project fields -->
        <div class="rounded-xl border border-default bg-elevated p-4 space-y-4">
          <h2 class="text-sm font-semibold text-highlighted flex items-center gap-2">
            <UIcon
              name="i-lucide-folder"
              class="size-4 text-primary"
            />
            Project Details
          </h2>

          <!-- projectName — no restrictions -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-1.5">
              <label class="text-xs font-medium text-muted">Project Name</label>
              <UBadge
                label="all roles"
                color="success"
                variant="subtle"
                size="xs"
              />
            </div>
            <UInput
              v-model="state.projectName.value"
              class="w-full"
            />
          </div>

          <!-- status — everyone reads, editor+ writes. Changing this also affects task permissions. -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-1.5">
              <label class="text-xs font-medium text-muted">Status</label>
              <UBadge
                label="read: all · write: admin, editor"
                color="info"
                variant="subtle"
                size="xs"
              />
              <UBadge
                label="drives task business logic"
                color="primary"
                variant="subtle"
                size="xs"
              />
            </div>
            <USelect
              v-model="state.status.value"
              :items="['active', 'paused', 'completed']"
              :disabled="!fieldPermissions.status.canWrite.value"
              class="w-full"
            />
            <p
              v-if="!fieldPermissions.status.canWrite.value"
              class="text-xs text-muted flex items-center gap-1"
            >
              <UIcon
                name="i-lucide-lock"
                class="size-3"
              />
              Read-only for {{ currentRole }}
            </p>
          </div>

          <!-- budget — admin only -->
          <div
            v-if="fieldPermissions.budget.canRead.value"
            class="space-y-1.5"
          >
            <div class="flex items-center gap-1.5">
              <label class="text-xs font-medium text-muted">Budget ($)</label>
              <UBadge
                label="admin only"
                color="error"
                variant="subtle"
                size="xs"
              />
            </div>
            <UInput
              v-model.number="state.budget.value"
              type="number"
              :disabled="!fieldPermissions.budget.canWrite.value"
              class="w-full"
            />
          </div>
          <div
            v-else
            class="flex items-center gap-2 rounded-lg border border-dashed border-default px-3 py-2.5"
          >
            <UIcon
              name="i-lucide-eye-off"
              class="size-3.5 text-muted"
            />
            <span class="text-xs text-muted italic">
              Budget hidden — <code class="bg-muted px-1 rounded">permissions.budget.read: 'admin'</code>
            </span>
          </div>

          <!-- internalNotes — admin + editor -->
          <div
            v-if="fieldPermissions.internalNotes.canRead.value"
            class="space-y-1.5"
          >
            <div class="flex items-center gap-1.5">
              <label class="text-xs font-medium text-muted">Internal Notes</label>
              <UBadge
                label="admin + editor"
                color="warning"
                variant="subtle"
                size="xs"
              />
            </div>
            <UTextarea
              v-model="state.internalNotes.value"
              :disabled="!fieldPermissions.internalNotes.canWrite.value"
              class="w-full"
              :rows="2"
            />
          </div>
          <div
            v-else
            class="flex items-center gap-2 rounded-lg border border-dashed border-default px-3 py-2.5"
          >
            <UIcon
              name="i-lucide-eye-off"
              class="size-3.5 text-muted"
            />
            <span class="text-xs text-muted italic">
              Internal Notes hidden — <code class="bg-muted px-1 rounded">permissions.read: ['admin', 'editor']</code>
            </span>
          </div>
        </div>

        <!-- Tasks collection -->
        <div
          v-if="taskPerms.canRead.value"
          class="rounded-xl border border-default bg-elevated p-4 space-y-3"
        >
          <h2 class="text-sm font-semibold text-highlighted flex items-center gap-2">
            <UIcon
              name="i-lucide-check-square"
              class="size-4 text-primary"
            />
            Tasks
            <UBadge
              :label="`${tasks.count.value}`"
              color="neutral"
              variant="subtle"
              size="xs"
            />
          </h2>

          <!-- Status-based lock banner -->
          <div
            v-if="statusLockReason"
            class="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2"
          >
            <UIcon
              name="i-lucide-lock"
              class="size-3.5 text-warning shrink-0"
            />
            <span class="text-xs text-warning">
              {{ statusLockReason }}
            </span>
            <span class="text-xs text-muted ml-1">
              — business logic, independent of role
            </span>
          </div>

          <!-- Task list -->
          <div
            v-if="tasks.items.value.length > 0"
            class="space-y-1.5"
          >
            <div
              v-for="(task, i) in tasks.items.value"
              :key="i"
              class="flex items-center gap-2.5 rounded-lg px-3 py-2 border border-default"
            >
              <UCheckbox
                :model-value="task.done"
                :disabled="!taskPerms.canUpdate.value"
                @update:model-value="tasks.update(i, { done: $event })"
              />
              <span
                class="flex-1 text-sm"
                :class="task.done ? 'line-through text-muted' : 'text-highlighted'"
              >
                {{ task.title || 'Untitled' }}
              </span>
              <UButton
                v-if="taskPerms.canDelete.value"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                @click="tasks.remove(i)"
              />
            </div>
          </div>
          <p
            v-else
            class="text-xs text-muted italic text-center py-2"
          >
            No tasks yet.
          </p>

          <!-- Add task -->
          <div
            v-if="taskPerms.canCreate.value"
            class="flex gap-2"
          >
            <UInput
              v-model="newTaskTitle"
              placeholder="New task…"
              class="flex-1"
              @keyup.enter="addTask"
            />
            <UButton
              label="Add"
              icon="i-lucide-plus"
              size="sm"
              @click="addTask"
            />
          </div>
          <p
            v-else
            class="text-xs text-muted flex items-center gap-1"
          >
            <UIcon
              name="i-lucide-lock"
              class="size-3"
            />
            <span v-if="!roleTaskPerms.canCreate.value">{{ currentRole }} cannot add tasks</span>
            <span v-else>Cannot add tasks — project is {{ state.status.value }}</span>
          </p>
        </div>
        <div
          v-else
          class="rounded-xl border border-dashed border-default px-4 py-4 flex items-center gap-2"
        >
          <UIcon
            name="i-lucide-lock"
            class="size-4 text-muted"
          />
          <span class="text-sm text-muted italic">
            Tasks hidden —
            <code class="bg-muted px-1 rounded">permissions.read: ['admin', 'editor', 'viewer']</code>
          </span>
        </div>

        <!-- Permission status grid -->
        <div class="rounded-xl border border-default bg-elevated overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-2.5 border-b border-default bg-muted/30">
            <UIcon
              name="i-lucide-table-2"
              class="size-3.5 text-muted"
            />
            <span class="text-xs text-muted font-medium">
              Effective permissions —
              <UBadge
                :label="currentRole"
                :color="roleColors[currentRole]"
                variant="subtle"
                size="xs"
              />
              + status:
              <UBadge
                :label="state.status.value"
                color="neutral"
                variant="subtle"
                size="xs"
              />
            </span>
          </div>

          <!-- Field permissions (role only) -->
          <div class="px-4 py-1.5 bg-muted/10 border-b border-default">
            <span class="text-xs text-muted font-medium uppercase tracking-wide">Fields · role guards</span>
          </div>
          <div class="divide-y divide-default text-xs">
            <div
              v-for="row in [
                { label: 'projectName · read', value: true, roleValue: true },
                { label: 'projectName · write', value: true, roleValue: true },
                { label: 'status · read', value: fieldPermissions.status.canRead.value, roleValue: fieldPermissions.status.canRead.value },
                { label: 'status · write', value: fieldPermissions.status.canWrite.value, roleValue: fieldPermissions.status.canWrite.value },
                { label: 'budget · read', value: fieldPermissions.budget.canRead.value, roleValue: fieldPermissions.budget.canRead.value },
                { label: 'budget · write', value: fieldPermissions.budget.canWrite.value, roleValue: fieldPermissions.budget.canWrite.value },
                { label: 'internalNotes · read', value: fieldPermissions.internalNotes.canRead.value, roleValue: fieldPermissions.internalNotes.canRead.value },
                { label: 'internalNotes · write', value: fieldPermissions.internalNotes.canWrite.value, roleValue: fieldPermissions.internalNotes.canWrite.value },
              ]"
              :key="row.label"
              class="flex items-center gap-3 px-4 py-1.5"
            >
              <UIcon
                :name="row.value ? 'i-lucide-check' : 'i-lucide-x'"
                :class="row.value ? 'text-success' : 'text-error'"
                class="size-3.5 shrink-0"
              />
              <span
                :class="row.value ? 'text-highlighted' : 'text-muted'"
                class="font-mono flex-1"
              >{{ row.label }}</span>
              <UBadge
                :label="row.value ? 'allowed' : 'denied · role'"
                :color="row.value ? 'success' : 'error'"
                variant="subtle"
                size="xs"
              />
            </div>
          </div>

          <!-- Task permissions (role + business logic) -->
          <div class="px-4 py-1.5 bg-muted/10 border-y border-default">
            <span class="text-xs text-muted font-medium uppercase tracking-wide">Tasks · role + status</span>
          </div>
          <div class="divide-y divide-default text-xs">
            <div
              v-for="row in [
                { label: 'tasks · read', role: roleTaskPerms.canRead.value, effective: taskPerms.canRead.value },
                { label: 'tasks · create', role: roleTaskPerms.canCreate.value, effective: taskPerms.canCreate.value },
                { label: 'tasks · update (done)', role: roleTaskPerms.canUpdate.value, effective: taskPerms.canUpdate.value },
                { label: 'tasks · delete', role: roleTaskPerms.canDelete.value, effective: taskPerms.canDelete.value },
              ]"
              :key="row.label"
              class="flex items-center gap-3 px-4 py-1.5"
            >
              <UIcon
                :name="row.effective ? 'i-lucide-check' : 'i-lucide-x'"
                :class="row.effective ? 'text-success' : (row.role ? 'text-warning' : 'text-error')"
                class="size-3.5 shrink-0"
              />
              <span
                :class="row.effective ? 'text-highlighted' : 'text-muted'"
                class="font-mono flex-1"
              >{{ row.label }}</span>
              <!-- Role badge -->
              <UBadge
                :label="row.role ? 'role ✓' : 'role ✗'"
                :color="row.role ? 'neutral' : 'error'"
                variant="subtle"
                size="xs"
              />
              <!-- Effective badge shows combined result and reason for denial -->
              <UBadge
                :label="permReason(row.role, row.effective).label"
                :color="permReason(row.role, row.effective).color"
                variant="subtle"
                size="xs"
              />
            </div>
          </div>

          <div class="px-4 py-2.5 border-t border-default bg-muted/20 flex items-start gap-1.5">
            <UIcon
              name="i-lucide-triangle-alert"
              class="size-3.5 text-warning mt-0.5 shrink-0"
            />
            <p class="text-xs text-muted leading-relaxed">
              Frontend guard only. Field guards are a UX convenience — protect collections server-side for real security.
            </p>
          </div>
        </div>
      </template>

      <template #fallback>
        <div class="space-y-4 animate-pulse">
          <div class="h-10 bg-muted rounded-xl" />
          <div class="h-32 bg-muted rounded-xl" />
          <div class="h-24 bg-muted rounded-xl" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
