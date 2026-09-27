<script setup>
import { ref, watch, computed } from 'vue'
import { useProtoDraft } from '../composables/useProtoDraft'

const props = defineProps({
  schema: { type: Object, required: true },
  editData: { type: [Object, null], required: false },
  doc: { type: null, required: true },
  draftKey: { type: String, required: true },
  collectionItems: { type: Object, required: false },
})
const emit = defineEmits(['save', 'cancel'])
const isOpen = defineModel('open', { type: Boolean, ...{ default: false } })
const { hasDraft, saveDraft, loadDraft, clearDraft } = useProtoDraft(props.doc, props.draftKey, props.schema.defaults)
const formData = ref({ ...props.schema.defaults })
const showDraftBanner = ref(false)
const model = computed(() => {
  const result = {}
  for (const key of Object.keys(props.schema.fields)) {
    result[key] = computed({
      get: () => formData.value[key],
      set: (v) => {
        formData.value[key] = v
      },
    })
  }
  return result
})
watch(isOpen, (open) => {
  if (!open) return
  if (props.editData) {
    formData.value = { ...props.editData }
    showDraftBanner.value = false
  }
  else if (hasDraft.value) {
    formData.value = { ...props.schema.defaults }
    showDraftBanner.value = true
  }
  else {
    formData.value = { ...props.schema.defaults }
    showDraftBanner.value = false
  }
})
watch(() => props.editData, (data) => {
  if (data) {
    formData.value = { ...data }
    showDraftBanner.value = false
  }
})
let draftTimer = null
watch(formData, (data) => {
  if (!isOpen.value) return
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
const validationError = ref(null)
const fieldErrors = ref({})
function save() {
  if (props.schema.validate) {
    const result = props.schema.validate(formData.value)
    if (result !== true) {
      if (result && typeof result === 'object') {
        fieldErrors.value = result
        validationError.value = null
      }
      else {
        fieldErrors.value = {}
        validationError.value = typeof result === 'string' ? result : 'Please fix the errors before saving.'
      }
      return
    }
  }
  validationError.value = null
  fieldErrors.value = {}
  clearDraft()
  emit('save', { ...formData.value })
  isOpen.value = false
  formData.value = { ...props.schema.defaults }
}
function cancel() {
  emit('cancel')
  isOpen.value = false
}
const modalTitle = computed(() => props.editData ? `Edit ${props.schema.title}` : `Add ${props.schema.title}`)
const maxWMap = {
  'sm': 'max-w-sm',
  'md': 'max-w-md',
  'lg': 'max-w-lg',
  'xl': 'max-w-xl',
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
const formCols = computed(() => {
  const size = props.schema.modalSize
  if (size && ['lg', 'xl', '2xl', '3xl', '4xl', '5xl'].includes(size)) return 2
  return 1
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="modalTitle"
    :ui="modalUi"
    scrollable
  >
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
          <UButton
            size="xs"
            variant="outline"
            @click="resumeDraft"
          >
            Resume
          </UButton>
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            @click="discardDraft"
          >
            Discard
          </UButton>
        </template>
      </UAlert>

      <ProtoForm
        :fields="schema.fields"
        :model="model"
        :cols="formCols"
        :collection-items="collectionItems"
        :errors="fieldErrors"
      />

      <UAlert
        v-if="validationError"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :description="validationError"
        class="mt-4"
      />
    </template>

    <template #footer>
      <div class="flex gap-2">
        <UButton
          icon="i-lucide-check"
          @click="save"
        >
          {{ editData ? "Save Changes" : "Add" }}
        </UButton>
        <UButton
          variant="ghost"
          color="neutral"
          @click="cancel"
        >
          Cancel
        </UButton>
      </div>
    </template>
  </UModal>
</template>
