<script setup lang="ts">
import { ref, computed } from 'vue'
import type * as Y from 'yjs'
import type { CollectionSchema, PresetPack } from '../types/schema'

const props = withDefaults(defineProps<{
  schema: CollectionSchema
  items: any[]
  searchQuery?: string
  doc?: Y.Doc
  collectionItems?: Record<string, any[]>
}>(), {
  searchQuery: '',
})

const emit = defineEmits<{
  add: [item: any]
  update: [index: number, item: any]
  remove: [index: number]
  move: [from: number, to: number]
}>()

const isModalMode = computed(() => props.schema.editMode === 'modal')

// Inline form state
const showForm = ref(false)
const editingIndex = ref<number | null>(null)
const editData = ref<Record<string, any> | null>(null)

// Modal state
const showModal = ref(false)
const modalEditingIndex = ref<number | null>(null)
const modalEditData = ref<Record<string, any> | null>(null)

const search = ref(props.searchQuery)

const filteredItems = computed(() => {
  if (!search.value || !props.schema.searchable) return props.items
  const q = search.value.toLowerCase()
  const searchFields = props.schema.searchFields || Object.keys(props.schema.fields)
  return props.items.filter((item) => {
    return searchFields.some((field) => {
      const val = item[field]
      return val != null && String(val).toLowerCase().includes(q)
    })
  })
})

function startAdd() {
  if (isModalMode.value) {
    modalEditingIndex.value = null
    modalEditData.value = null
    showModal.value = true
  }
  else {
    editingIndex.value = null
    editData.value = null
    showForm.value = true
  }
}

function startEdit(index: number) {
  if (isModalMode.value) {
    modalEditingIndex.value = index
    modalEditData.value = { ...props.items[index] }
    showModal.value = true
  }
  else {
    editingIndex.value = index
    editData.value = { ...props.items[index] }
    showForm.value = true
  }
}

function onSave(item: Record<string, any>) {
  if (editingIndex.value !== null) {
    emit('update', editingIndex.value, item)
  }
  else {
    emit('add', { id: Date.now(), ...item })
  }
  closeForm()
}

function onModalSave(item: Record<string, any>) {
  if (modalEditingIndex.value !== null) {
    emit('update', modalEditingIndex.value, item)
  }
  else {
    emit('add', { id: Date.now(), ...item })
  }
  showModal.value = false
  modalEditingIndex.value = null
  modalEditData.value = null
}

function closeForm() {
  showForm.value = false
  editingIndex.value = null
  editData.value = null
}

function removeItem(index: number) {
  emit('remove', index)
}

// Preset packs
const showPresetConfirm = ref(false)
const pendingPreset = ref<PresetPack | null>(null)

function applyPreset(preset: PresetPack) {
  if (props.items.length > 0) {
    pendingPreset.value = preset
    showPresetConfirm.value = true
  }
  else {
    loadPreset(preset)
  }
}

function confirmLoadPreset() {
  if (pendingPreset.value) {
    loadPreset(pendingPreset.value)
  }
  showPresetConfirm.value = false
  pendingPreset.value = null
}

function loadPreset(preset: PresetPack) {
  const existingIds = new Set(props.items.map(i => i.id || i.text || JSON.stringify(i)))
  for (const item of preset.items) {
    const itemId = item.id || item.text || JSON.stringify(item)
    if (!existingIds.has(itemId)) {
      emit('add', { id: Date.now() + Math.random(), ...item })
    }
  }
}

const hasPresets = computed(() => (props.schema.presets?.length ?? 0) > 0)
const showOnboardingPresets = computed(() =>
  props.schema.onboardingPresets && props.items.length === 0 && hasPresets.value,
)
const showCompactPresets = computed(() =>
  hasPresets.value && props.items.length > 0,
)

// Draft key for modal
const draftKey = computed(() => props.schema.key)
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UIcon
          v-if="schema.icon"
          :name="schema.icon"
          class="size-5 text-muted"
        />
        <h3 class="font-semibold">
          {{ schema.title }}
        </h3>
        <UBadge
          variant="subtle"
          size="sm"
        >
          {{ items.length }}
        </UBadge>
      </div>
      <UButton
        v-if="!showForm"
        variant="outline"
        icon="i-lucide-plus"
        size="sm"
        @click="startAdd"
      >
        Add
      </UButton>
    </div>

    <!-- Compact preset strip (when items exist) -->
    <div
      v-if="showCompactPresets"
      class="flex flex-wrap gap-2 p-2 rounded-lg bg-muted"
    >
      <span class="text-xs text-muted self-center">Load preset:</span>
      <UButton
        v-for="preset in schema.presets"
        :key="preset.id"
        size="xs"
        variant="subtle"
        :color="(preset.color as any) || 'neutral'"
        :icon="preset.icon"
        @click="applyPreset(preset)"
      >
        {{ preset.label }}
      </UButton>
    </div>

    <!-- Search -->
    <UInput
      v-if="schema.searchable && items.length > 0"
      v-model="search"
      class="w-full"
      placeholder="Search..."
      icon="i-lucide-search"
    />

    <!-- Inline Add/Edit Form -->
    <UCard v-if="showForm && !isModalMode">
      <template #header>
        <div class="flex items-center justify-between">
          <h4 class="font-medium">
            {{ editingIndex !== null ? 'Edit' : 'Add' }}
          </h4>
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            @click="closeForm"
          />
        </div>
      </template>
      <ProtoCrudInlineForm
        :fields="schema.fields"
        :defaults="schema.defaults"
        :edit-data="editData"
        :collection-items="collectionItems"
        :validate="schema.validate"
        @save="onSave"
        @cancel="closeForm"
      />
    </UCard>

    <!-- Modal Add/Edit -->
    <ProtoCrudModal
      v-if="isModalMode && doc"
      v-model:open="showModal"
      :schema="schema"
      :edit-data="modalEditData"
      :doc="doc"
      :draft-key="draftKey"
      :collection-items="collectionItems"
      @save="onModalSave"
      @cancel="showModal = false"
    />

    <!-- Preset confirm modal -->
    <UModal
      v-model:open="showPresetConfirm"
      title="Load preset pack?"
    >
      <template #body>
        <p class="text-sm text-muted">
          You already have {{ items.length }} item{{ items.length !== 1 ? 's' : '' }}.
          Load <strong>{{ pendingPreset?.label }}</strong> and add {{ pendingPreset?.items.length }} more
          (duplicates skipped)?
        </p>
        <div class="flex gap-2 mt-4">
          <UButton @click="confirmLoadPreset">
            Add to existing
          </UButton>
          <UButton
            variant="ghost"
            @click="showPresetConfirm = false; pendingPreset = null"
          >
            Cancel
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Onboarding preset cards (empty state) -->
    <div
      v-if="showOnboardingPresets"
      class="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      <UCard
        v-for="preset in schema.presets"
        :key="preset.id"
        class="cursor-pointer hover:ring-2 ring-primary transition-all"
        @click="applyPreset(preset)"
      >
        <div class="flex items-start gap-3">
          <UIcon
            v-if="preset.icon"
            :name="preset.icon"
            class="size-6 mt-0.5 shrink-0"
            :class="`text-${preset.color || 'primary'}-500`"
          />
          <div>
            <p class="font-semibold text-sm">
              {{ preset.label }}
            </p>
            <p
              v-if="preset.description"
              class="text-xs text-muted mt-0.5"
            >
              {{ preset.description }}
            </p>
            <p class="text-xs text-muted mt-1">
              {{ preset.items.length }} items
            </p>
          </div>
        </div>
      </UCard>
      <UCard
        class="cursor-pointer hover:ring-2 ring-default transition-all border-dashed"
        @click="startAdd"
      >
        <div class="flex items-center gap-3">
          <UIcon
            name="i-lucide-plus"
            class="size-6 text-muted"
          />
          <div>
            <p class="font-semibold text-sm">
              Start from scratch
            </p>
            <p class="text-xs text-muted mt-0.5">
              Add items manually
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Items list -->
    <div
      v-else-if="filteredItems.length > 0"
      class="space-y-2"
    >
      <div
        v-for="(item, index) in filteredItems"
        :key="item.id || index"
        class="flex items-center justify-between p-3 rounded-lg bg-elevated border border-default"
      >
        <slot
          name="item"
          :item="item"
          :index="index"
        >
          <div class="min-w-0 flex-1">
            <div class="font-medium text-highlighted truncate">
              {{ schema.listDisplay?.primaryField ? item[schema.listDisplay.primaryField] : schema.itemLabel(item) }}
            </div>
            <div
              v-if="schema.listDisplay?.secondaryField"
              class="text-sm text-muted truncate"
            >
              {{ item[schema.listDisplay.secondaryField] }}
            </div>
          </div>
          <div
            v-if="schema.listDisplay?.badgeField && item[schema.listDisplay.badgeField]"
            class="ml-2"
          >
            <UBadge
              variant="subtle"
              size="sm"
            >
              {{ item[schema.listDisplay.badgeField] }}
            </UBadge>
          </div>
        </slot>
        <div class="flex items-center gap-1 ml-2 shrink-0">
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-pencil"
            @click="startEdit(index)"
          />
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            color="error"
            @click="removeItem(index)"
          />
        </div>
      </div>
    </div>

    <!-- Empty state (no presets or presets hidden) -->
    <div
      v-else-if="!showForm && !showOnboardingPresets"
      class="text-center py-8 text-muted"
    >
      <UIcon
        :name="schema.icon || 'i-lucide-list'"
        class="size-8 mx-auto mb-2 opacity-50"
      />
      <p class="text-sm">
        No items yet. Click "Add" to get started.
      </p>
    </div>
  </div>
</template>
