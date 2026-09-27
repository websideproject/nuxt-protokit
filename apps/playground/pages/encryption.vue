<script setup lang="ts">
import type { PrototypeSchema } from '#protokit/types'

// A schema that stores sensitive-ish planning data
const schema: PrototypeSchema = {
  key: 'encrypted-plan',
  title: 'Encrypted Business Plan',
  shortTitle: 'Encrypted',
  description: 'All data is encrypted with AES-GCM before being written to IndexedDB.',
  icon: 'i-lucide-lock',
  defaultCols: 2,
  fields: {
    companyName: {
      type: 'text',
      label: 'Company Name',
      default: '',
      placeholder: 'Acme Corp',
    },
    monthlyRevenue: {
      type: 'number',
      label: 'Monthly Revenue',
      default: 0,
      leading: '$',
    },
    headcount: {
      type: 'number',
      label: 'Headcount',
      default: 1,
      trailing: 'people',
    },
    runway: {
      type: 'number',
      label: 'Runway',
      default: 12,
      trailing: 'months',
    },
    notes: {
      type: 'textarea',
      label: 'Confidential Notes',
      default: '',
      placeholder: 'Strategic notes, investor info…',
    },
  },
  derived: {
    annualRevenue: {
      compute: ctx => ctx.fields.monthlyRevenue * 12,
    },
    revenuePerHead: {
      compute: ctx =>
        ctx.fields.headcount > 0
          ? Math.round(ctx.fields.monthlyRevenue / ctx.fields.headcount)
          : 0,
    },
  },
  results: [
    {
      title: 'Summary',
      statCols: 2,
      stats: ctx => [
        { label: 'Annual Revenue', value: `$${ctx.derived.annualRevenue.toLocaleString()}` },
        { label: 'Revenue / Head', value: `$${ctx.derived.revenuePerHead.toLocaleString()}` },
        { label: 'Runway', value: `${ctx.fields.runway} months` },
        { label: 'Headcount', value: String(ctx.fields.headcount) },
      ],
    },
  ],
}

const password = ref('')
const confirmedPassword = ref<string | null>(null)
const showPassword = ref(false)

function unlock() {
  if (password.value.trim())
    confirmedPassword.value = password.value
}

function lock() {
  confirmedPassword.value = null
  password.value = ''
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-8 space-y-6">
    <UAlert
      icon="i-lucide-shield"
      color="info"
      variant="subtle"
      title="How encryption works here"
      description="Every Y.js update is encrypted with AES-GCM (256-bit) before being written to IndexedDB. The key is derived from your password using PBKDF2 (100k iterations). Open DevTools → Application → IndexedDB and you will see only encrypted binary blobs — no readable field values."
    />

    <!-- Password gate -->
    <UCard v-if="confirmedPassword === null">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-lock"
            class="size-4"
          />
          <span class="font-semibold">Enter your encryption password</span>
        </div>
        <p class="text-sm text-muted mt-1">
          This password is used to encrypt your data locally. It is never sent to a server.
          If you forget it, your data cannot be recovered.
        </p>
      </template>

      <div class="space-y-4">
        <UFormField label="Password">
          <UInput
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Enter a password to unlock your data"
            autofocus
            class="w-full"
            @keydown.enter="unlock"
          >
            <template #trailing>
              <UButton
                variant="ghost"
                size="xs"
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>
        <UButton
          icon="i-lucide-unlock"
          :disabled="!password.trim()"
          @click="unlock"
        >
          Unlock / Create
        </UButton>
      </div>

      <template #footer>
        <p class="text-xs text-muted">
          Using the same password loads your existing data. A different password opens a
          separate empty document — encrypted and unencrypted stores never mix.
        </p>
      </template>
    </UCard>

    <!-- Unlocked tool -->
    <template v-else>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-shield-check"
            class="size-4 text-success-500"
          />
          <span class="text-sm font-medium text-highlighted">Encrypted with AES-GCM</span>
          <UBadge
            color="success"
            variant="subtle"
            size="sm"
          >
            Unlocked
          </UBadge>
        </div>
        <UButton
          variant="ghost"
          size="sm"
          icon="i-lucide-lock"
          @click="lock"
        >
          Lock
        </UButton>
      </div>

      <ClientOnly>
        <ProtoTool
          :schema="schema"
          :encryption-password="confirmedPassword"
          disable-sync
        />
        <template #fallback>
          <div class="h-64 bg-muted rounded animate-pulse" />
        </template>
      </ClientOnly>

      <UAlert
        icon="i-lucide-info"
        color="neutral"
        variant="subtle"
        title="Try it"
        description="Fill in some values, reload the page, enter the same password — your data is restored. Enter a different password — you get an empty document. This is AES-GCM: without the key, the ciphertext is indistinguishable from random bytes."
      />
    </template>
  </div>
</template>
