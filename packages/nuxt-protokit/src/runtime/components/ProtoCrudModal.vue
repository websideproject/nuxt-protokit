<script setup lang="ts">
import { ref, watch, computed, type WritableComputedRef } from 'vue'
import * as Y from 'yjs'
import type { CollectionSchema } from '../types/schema'
import { useProtoDraft } from '../composables/useProtoDraft'

const props = defineProps<{
  schema: CollectionSchema
  editData?: Record<string, any> | null
  doc: Y.Doc
  draftKey: string
  collectionItems?: Record<string, any[]>
}>()

const emit = defineEmits<{
  save: [item: Record<string, any>]
  cancel: []
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { hasDraft, saveDraft, loadDraft, clearDraft } = useProtoDraft(props.doc, props.draftKey, props.schema.defaults)

const formData = ref<Record<string, any>>({ ...props.schema.defaults })
const showDraftBanner = ref(false)

// Create writable computed refs for ProtoForm
const model = computed(() => {
  const result: Record<string, WritableComputedRef<any>> = {}
  for (const key of Object.keys(props.schema.fields)) {
    result[key] = computed({
      get: () => formData.value[key],
      set: (v) => { formData.value[key] = v },
    })
  }
  return result
})

// When modal opens
watch(isOpen, (open) => {
  if (!open) return
  if (props.editData) {
    formData.value = { ...props.editData }
    showDraftBanner.value = false
  } else if (hasDraft.value) {
    formData.value = { ...props.schema.defaults }
    showDraftBanner.value = true
  } else {
    formData.value = { ...props.schema.defaults }
    showDraftBanner.value = false
  }
})

// When editData changes
watch(() => props.editData, (data) => {
  if (data) {
    formData.value = { ...data }
    showDraftBanner.value = false
  }
})

// Debounced draft auto-save (only for new items, not edits)
// Guard: don't auto-save while showing the resume banner — that would overwrite the real draft with defaults
let draftTimer: ReturnType<typeof setTimeout> | null = null
watch(formData, (data) => {
  if (props.editData) return
  if (showDraftBanner.value) return
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    saveDraft(data)
  }, 400)
}, { deep: true })

function resumeDraft() {
  formData.value = loadDraft()
  showDraftBanner.value = false
}

function discardDraft() {
  clearDraft()
  formData.value = { ...props.schema.defaults }
  showDraftBanner.value = false
}

function save() {
  clearDraft()
  emit('save', { ...formData.value })
  isOpen.value = false
  formData.value = { ...props.schema.defaults }
}

function cancel() {
  // Keep draft silently on close
  emit('cancel')
  isOpen.value = false
}

const modalTitle = computed(() => props.editData ? `Edit ${props.schema.title}` : `Add ${props.schema.title}`)

const maxWMap: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
}
const modalUi = computed(() => {
  const size = props.schema.modalSize
  if (!size) return {}
  return { content: maxWMap[size] }
})

// Use 2 columns for wider modals
const formCols = computed<1 | 2>(() => {
  const size = props.schema.modalSize
  if (size && ['lg', 'xl', '2xl', '3xl', '4xl', '5xl'].includes(size)) return 2
  return 1
})
</script>

<template>
  <UModal v-model:open="isOpen" :title="modalTitle" :ui="modalUi" scrollable>
    <template #body>
      <!-- Draft resume banner -->
      <UAlert
        v-if="showDraftBanner"
        icon="i-lucide-save"
        color="info"
        variant="subtle"
        title="Resume draft?"
        description="You have an unsaved draft from a previous session."
        class="mb-4"
      >
        <template #actions>
          <UButton size="xs" variant="outline" @click="resumeDraft">Resume</UButton>
          <UButton size="xs" variant="ghost" color="neutral" @click="discardDraft">Discard</UButton>
        </template>
      </UAlert>

      <ProtoForm
        :fields="schema.fields"
        :model="model"
        :cols="formCols"
        :collection-items="collectionItems"
      />
    </template>

    <template #footer>
      <div class="flex gap-2">
        <UButton icon="i-lucide-check" @click="save">
          {{ editData ? 'Save Changes' : 'Add' }}
        </UButton>
        <UButton variant="ghost" color="neutral" @click="cancel">
          Cancel
        </UButton>
      </div>
    </template>
  </UModal>
</template>
