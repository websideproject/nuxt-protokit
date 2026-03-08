<script setup lang="ts">
import type * as Y from 'yjs'
import type { PrototypeSchema } from '../types/schema'
import { usePrototype } from '../composables/usePrototype'
import type { EncryptionConfig } from '../composables/useProtoDoc'

const props = defineProps<{
  schema: PrototypeSchema
  doc?: Y.Doc
  docKey?: string
  /**
   * Namespace prefix for the Y.js document key, creating isolated IndexedDB
   * stores and BroadcastChannels per namespace. Compose from whatever segments
   * your app requires:
   *
   * ```html
   * <!-- Tenant-shared: all users in the org share one doc -->
   * <ProtoTool :schema="s" :namespace="tenantId" />
   *
   * <!-- Private per user within a tenant -->
   * <ProtoTool :schema="s" :namespace="`${tenantId}:${userId}`" />
   * ```
   *
   * Resulting key: `<namespace>:<schema.key>`
   */
  namespace?: string
  /**
   * Encrypt all IndexedDB updates with AES-GCM using this password.
   * The key is derived via PBKDF2; the salt is stored in the encrypted IDB.
   * For CryptoKey-based encryption, use `usePrototype` directly.
   *
   * ⚠️ Changing the password or removing it starts a fresh document —
   * encrypted and unencrypted stores are always separate.
   */
  encryptionPassword?: string
  /**
   * Force this tool's document to be local-only (no server sync),
   * regardless of the global `protokit.serverSync` config.
   * Useful for public demo tools or scratch pads.
   *
   * @example <ProtoTool :schema="demoSchema" disable-sync />
   */
  disableSync?: boolean
}>()

const encryption = computed<EncryptionConfig | undefined>(() =>
  props.encryptionPassword ? { password: props.encryptionPassword } : undefined,
)

const { state, collections, derived, computeContext, reset, isReady, doc } = usePrototype(props.schema, {
  docKey: props.docKey,
  existingDoc: props.doc,
  namespace: props.namespace,
  encryption: encryption.value,
  disableSync: props.disableSync,
})

// Default layout: if schema has a layout, use ProtoDashboard; otherwise render in order
const hasLayout = computed(() => !!props.schema.layout)

// Unwrap collection items for passing to child components
const collectionItems = computed(() => {
  const result: Record<string, any[]> = {}
  for (const [k, v] of Object.entries(collections)) {
    result[k] = v.items.value
  }
  return result
})
</script>

<template>
  <div
    v-if="!isReady"
    class="flex items-center justify-center py-12"
  >
    <UIcon
      name="i-lucide-loader-2"
      class="size-6 animate-spin text-muted"
    />
  </div>

  <div
    v-else
    class="space-y-6"
  >
    <!-- Custom layout via ProtoDashboard -->
    <ProtoDashboard
      v-if="hasLayout"
      :schema="schema"
      :state="state"
      :collections="collections"
      :compute-context="computeContext"
      :derived="(derived as any)"
      :doc="doc"
      :collection-items="collectionItems"
      @reset="reset"
    />

    <!-- Default layout: form → results → visualizations → collections -->
    <div
      v-else
      class="space-y-6"
    >
      <!-- Form: section mode - ProtoForm adds its own cards per section -->
      <ProtoForm
        v-if="schema.sections"
        :fields="schema.fields"
        :model="state"
        :sections="schema.sections"
        :cols="schema.defaultCols"
        :collection-items="collectionItems"
      />
      <!-- Form: flat mode - single card with schema title as header -->
      <UCard v-else>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              v-if="schema.icon"
              :name="schema.icon"
              class="size-5"
            />
            <h3 class="font-semibold">
              {{ schema.title }}
            </h3>
          </div>
          <p
            v-if="schema.description"
            class="text-sm text-muted mt-1"
          >
            {{ schema.description }}
          </p>
        </template>
        <ProtoForm
          :fields="schema.fields"
          :model="state"
          :cols="schema.defaultCols"
          :collection-items="collectionItems"
        />
      </UCard>

      <!-- Results -->
      <template
        v-for="(result, ri) in schema.results"
        :key="ri"
      >
        <UCard v-if="!result.showWhen || result.showWhen(computeContext)">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">
                {{ result.title }}
              </h3>
              <ProtoBadge
                v-if="result.badge?.(computeContext)"
                v-bind="result.badge!(computeContext)!"
              />
            </div>
          </template>
          <ProtoStatGrid
            :stats="result.stats(computeContext)"
            :cols="result.statCols"
          />
        </UCard>
      </template>

      <!-- Visualizations -->
      <UCard
        v-for="(viz, vi) in schema.visualizations"
        :key="`viz-${vi}`"
      >
        <ProtoViz
          :viz="viz"
          :context="computeContext"
        />
      </UCard>

      <!-- Cards -->
      <template v-if="schema.cards">
        <div class="grid md:grid-cols-2 gap-4">
          <ProtoCard
            v-for="(card, ci) in schema.cards"
            :key="`card-${ci}`"
            :title="card.title"
            :icon="card.icon"
            :description="card.description"
            :stats="card.stats?.(computeContext)"
            :badge="card.badge?.(computeContext)"
            :footer="card.footer"
          />
        </div>
      </template>

      <!-- Collections -->
      <template
        v-for="(collSchema, collKey) in schema.collections"
        :key="collKey"
      >
        <UCard v-if="collections[collKey]">
          <ProtoCrudList
            :schema="collSchema"
            :items="collections[collKey].items.value"
            :doc="doc"
            :collection-items="collectionItems"
            @add="collections[collKey].add($event)"
            @update="(idx, val) => collections[collKey].update(idx, val)"
            @remove="collections[collKey].remove($event)"
          />
        </UCard>
      </template>

      <!-- Reset -->
      <div class="flex justify-end">
        <UButton
          variant="ghost"
          size="sm"
          icon="i-lucide-rotate-ccw"
          @click="reset"
        >
          Reset
        </UButton>
      </div>
    </div>

    <!-- Action bar (always at bottom when actions defined) -->
    <ProtoActionBar
      v-if="schema.actions?.length"
      :actions="schema.actions"
      :compute-context="computeContext"
      :collection-arrays="collectionItems"
      :on-reset="reset"
    />
  </div>
</template>
