<script setup lang="ts">
import { ref, computed, type WritableComputedRef } from 'vue'
import type { FieldDef } from '../types/schema'

const props = withDefaults(defineProps<{
  fields: Record<string, FieldDef>
  defaults: Record<string, any>
  cols?: 1 | 2 | 3 | 4
  editData?: Record<string, any> | null
  addLabel?: string
  editLabel?: string
  collectionItems?: Record<string, any[]>
}>(), {
  cols: 2,
  addLabel: 'Add',
  editLabel: 'Save',
})

const emit = defineEmits<{
  save: [item: Record<string, any>]
  cancel: []
}>()

const formData = ref<Record<string, any>>({ ...props.defaults })

// When editData changes, populate form
watch(() => props.editData, (data) => {
  if (data) {
    formData.value = { ...data }
  } else {
    formData.value = { ...props.defaults }
  }
}, { immediate: true })

// Create writable computed refs for ProtoForm compatibility
const model = computed(() => {
  const result: Record<string, WritableComputedRef<any>> = {}
  for (const key of Object.keys(props.fields)) {
    result[key] = computed({
      get: () => formData.value[key],
      set: (v) => { formData.value[key] = v },
    })
  }
  return result
})

function save() {
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
    />
    <div class="flex gap-2">
      <UButton variant="outline" icon="i-lucide-check" @click="save">
        {{ editData ? editLabel : addLabel }}
      </UButton>
      <UButton v-if="editData" variant="ghost" size="sm" @click="cancel">
        Cancel
      </UButton>
    </div>
  </div>
</template>
