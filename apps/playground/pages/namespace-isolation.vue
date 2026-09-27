<script setup lang="ts">
import type { PrototypeSchema } from '#protokit/types'

// Simple schema — the interesting part is per-user isolation, not the fields
const schema: PrototypeSchema = {
  key: 'user-plan',
  title: 'User Plan',
  shortTitle: 'Plan',
  description: 'Each user has their own isolated document. Switching users never mixes data.',
  icon: 'i-lucide-user',
  fields: {
    goal: {
      type: 'text',
      label: 'Primary Goal',
      default: '',
      placeholder: 'e.g. Launch in Q3…',
    },
    budget: {
      type: 'number',
      label: 'Budget',
      default: 0,
      leading: '$',
    },
    priority: {
      type: 'segmented',
      label: 'Priority',
      default: 'medium',
      options: ['low', 'medium', 'high'],
    },
    notes: {
      type: 'textarea',
      label: 'Notes',
      default: '',
    },
  },
}

// Simulated users — in a real app these come from your auth session
const USERS = [
  { id: 'usr_alice', name: 'Alice', color: 'primary' as const },
  { id: 'usr_bob', name: 'Bob', color: 'success' as const },
  { id: 'usr_carol', name: 'Carol', color: 'warning' as const },
]
const TENANT_ID = 'tenant_acme'

const currentUserId = ref<string | null>(null)
const clearStatus = ref<string | null>(null)

const currentUser = computed(() => USERS.find(u => u.id === currentUserId.value) ?? null)
// Namespace = tenantId + userId — private per user within the tenant
const namespace = computed(() =>
  currentUserId.value ? `${TENANT_ID}:${currentUserId.value}` : null,
)

function login(userId: string) {
  currentUserId.value = userId
  clearStatus.value = null
}

async function logout() {
  if (!namespace.value) return
  clearStatus.value = 'Clearing local data…'
  await clearProtoNamespace(namespace.value)
  currentUserId.value = null
  clearStatus.value = null
}

async function logoutWithoutClearing() {
  currentUserId.value = null
  clearStatus.value = null
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-6 py-8 space-y-6">
    <UAlert
      icon="i-lucide-users"
      color="info"
      variant="subtle"
      title="How namespace isolation works"
      description="Each user gets their own IndexedDB store keyed proto:<tenantId>:<userId>:<schema>. Switching users opens a different store — data never bleeds. The 'Logout + clear' button deletes the local store; 'Logout (keep data)' leaves it for next time."
    />

    <!-- Login screen -->
    <UCard v-if="!currentUser">
      <template #header>
        <span class="font-semibold">Select a user to log in</span>
      </template>
      <div class="flex flex-wrap gap-3">
        <UButton
          v-for="user in USERS"
          :key="user.id"
          :color="user.color"
          variant="subtle"
          :icon="'i-lucide-user'"
          @click="login(user.id)"
        >
          Log in as {{ user.name }}
        </UButton>
      </div>
      <template #footer>
        <p class="text-xs text-muted">
          Tenant: <code>{{ TENANT_ID }}</code> — all users are isolated within this tenant.
          Try logging in as Alice, editing, logging out, then logging in as Bob — Bob sees an empty doc.
        </p>
      </template>
    </UCard>

    <!-- Logged-in user -->
    <template v-else>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UBadge
            :color="currentUser.color"
            variant="subtle"
          >
            {{ currentUser.name }}
          </UBadge>
          <span class="text-xs text-muted font-mono">
            namespace: {{ namespace }}
          </span>
        </div>
        <div class="flex gap-2">
          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-log-out"
            @click="logoutWithoutClearing"
          >
            Logout (keep data)
          </UButton>
          <UButton
            variant="soft"
            color="error"
            size="sm"
            icon="i-lucide-trash-2"
            @click="logout"
          >
            Logout + clear
          </UButton>
        </div>
      </div>

      <p
        v-if="clearStatus"
        class="text-sm text-muted"
      >
        {{ clearStatus }}
      </p>

      <ClientOnly>
        <ProtoTool
          :key="namespace!"
          :schema="schema"
          :namespace="namespace!"
          disable-sync
        />
        <template #fallback>
          <div class="h-48 bg-muted rounded animate-pulse" />
        </template>
      </ClientOnly>

      <UAlert
        icon="i-lucide-lightbulb"
        color="neutral"
        variant="subtle"
        title="Try it"
        description="Log in as Alice, fill in some fields, then log out (keep data). Log in as Bob — empty doc. Log in as Alice again — her data is still there. Then try 'Logout + clear' and log back in as Alice — her local store is gone."
      />
    </template>
  </div>
</template>
