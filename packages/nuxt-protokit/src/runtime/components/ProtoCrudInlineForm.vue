<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  fields: { type: Object, required: true },
  defaults: { type: Object, required: true },
  cols: { type: Number, required: false, default: 2 },
  editData: { type: [Object, null], required: false },
  addLabel: { type: String, required: false, default: 'Add' },
  editLabel: { type: String, required: false, default: 'Save' },
  collectionItems: { type: Object, required: false },
  validate: { type: Function, required: false },
})
const emit = defineEmits(['save', 'cancel'])
const formData = ref({ ...props.defaults })
watch(() => props.editData, (data) => {
  if (data) {
    formData.value = { ...data }
  }
  else {
    formData.value = { ...props.defaults }
  }
}, { immediate: true })
const model = computed(() => {
  const result = {}
  for (const key of Object.keys(props.fields)) {
    result[key] = computed({
      get: () => formData.value[key],
      set: (v) => {
        formData.value[key] = v
      },
    })
  }
  return result
})
const validationError = ref(null)
const fieldErrors = ref({})
function save() {
  if (props.validate) {
    const result = props.validate(formData.value)
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
  emit('save', { ...formData.value })
  formData.value = { ...props.defaults }
}
function cancel() {
  formData.value = { ...props.defaults }
  emit('cancel')
}
</script>

<template>
  <div class="space-y-3">
    <ProtoForm
      :fields="fields"
      :model="model"
      :cols="cols"
      :collection-items="collectionItems"
      :errors="fieldErrors"
    />
    <div class="space-y-2">
      <p
        v-if="validationError"
        class="text-sm text-error flex items-center gap-1.5"
      >
        <UIcon
          name="i-lucide-circle-alert"
          class="size-4 shrink-0"
        />
        {{ validationError }}
      </p>
      <div class="flex gap-2">
        <UButton
          variant="outline"
          icon="i-lucide-check"
          @click="save"
        >
          {{ editData ? editLabel : addLabel }}
        </UButton>
        <UButton
          v-if="editData"
          variant="ghost"
          size="sm"
          @click="cancel"
        >
          Cancel
        </UButton>
      </div>
    </div>
  </div>
</template>
