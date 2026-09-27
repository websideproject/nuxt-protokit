<script setup>
import { ref, watch, computed } from 'vue'
import { CALENDAR_EVENT_DEFAULTS, CALENDAR_COLORS, CALENDAR_COLOR_HEX } from '../types/calendar'
import { toLocalISOString } from '../utils/calendarLayout'

const props = defineProps({
  event: { type: [Object, null], required: false },
  defaults: { type: Object, required: false },
})
const emit = defineEmits(['save', 'delete'])
const isOpen = defineModel('open', { type: Boolean, ...{ default: false } })
const isEditMode = computed(() => !!props.event?.id)
function buildFormData() {
  if (props.event?.id) {
    return { ...props.event }
  }
  const now = /* @__PURE__ */ new Date()
  now.setMinutes(0, 0, 0)
  const start = toLocalISOString(now)
  const end = toLocalISOString(new Date(now.getTime() + 60 * 60 * 1e3))
  return {
    ...CALENDAR_EVENT_DEFAULTS,
    startAt: start,
    endAt: end,
    ...props.defaults,
  }
}
const formData = ref(buildFormData())
const validationError = ref(null)
watch(isOpen, (open) => {
  if (!open) return
  formData.value = buildFormData()
  validationError.value = null
})
watch(() => props.event, (event) => {
  if (event) {
    formData.value = { ...event }
  }
})
watch(() => formData.value.allDay, (allDay) => {
  if (allDay) {
    const strStart = formData.value.startAt?.split('T')[0]
    const strEnd = formData.value.endAt?.split('T')[0]
    if (strStart) formData.value.startAt = `${strStart}T00:00:00`
    if (strEnd) formData.value.endAt = `${strEnd}T00:00:00`
  }
})
const startAtInput = computed({
  get: () => formData.value.startAt?.slice(0, 16) ?? '',
  set: (v) => {
    formData.value.startAt = v ? `${v}:00` : ''
  },
})
const endAtInput = computed({
  get: () => formData.value.endAt?.slice(0, 16) ?? '',
  set: (v) => {
    formData.value.endAt = v ? `${v}:00` : ''
  },
})
const startDateInput = computed({
  get: () => formData.value.startAt?.split('T')[0] ?? '',
  set: (v) => {
    formData.value.startAt = v ? `${v}T00:00:00` : ''
  },
})
const endDateInput = computed({
  get: () => formData.value.endAt?.split('T')[0] ?? '',
  set: (v) => {
    formData.value.endAt = v ? `${v}T00:00:00` : ''
  },
})
function save() {
  validationError.value = null
  if (!formData.value.title?.trim()) {
    validationError.value = 'Title is required.'
    return
  }
  if (formData.value.endAt && formData.value.startAt && formData.value.endAt < formData.value.startAt) {
    validationError.value = 'End time must be after start time.'
    return
  }
  emit('save', { ...formData.value })
  isOpen.value = false
}
function deleteEvent() {
  if (props.event) {
    emit('delete', props.event)
    isOpen.value = false
  }
}
function selectColor(color) {
  formData.value.color = color
}
function swatchStyle(color) {
  return { backgroundColor: CALENDAR_COLOR_HEX[color] ?? '#3b82f6' }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="isEditMode ? 'Edit Event' : 'New Event'"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Title -->
        <UFormField label="Title">
          <UInput
            v-model="formData.title"
            placeholder="Add title"
            autofocus
            class="w-full"
          />
        </UFormField>

        <!-- All-day toggle -->
        <div class="flex items-center gap-3">
          <USwitch
            v-model="formData.allDay"
            label="All day"
          />
        </div>

        <!-- Start/End -->
        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="formData.allDay ? 'Start date' : 'Start'">
            <UInput
              v-if="formData.allDay"
              :model-value="startDateInput"
              type="date"
              class="w-full"
              @update:model-value="startDateInput = $event"
            />
            <UInput
              v-else
              :model-value="startAtInput"
              type="datetime-local"
              class="w-full"
              @update:model-value="startAtInput = $event"
            />
          </UFormField>
          <UFormField :label="formData.allDay ? 'End date' : 'End'">
            <UInput
              v-if="formData.allDay"
              :model-value="endDateInput"
              type="date"
              class="w-full"
              @update:model-value="endDateInput = $event"
            />
            <UInput
              v-else
              :model-value="endAtInput"
              type="datetime-local"
              class="w-full"
              @update:model-value="endAtInput = $event"
            />
          </UFormField>
        </div>

        <!-- Color palette -->
        <UFormField label="Color">
          <div class="flex flex-wrap gap-2 mt-1">
            <button
              v-for="color in CALENDAR_COLORS"
              :key="color"
              class="w-5 h-5 rounded-full transition-transform focus:outline-none"
              :class="formData.color === color ? 'ring-2 ring-offset-2 ring-current scale-125' : 'hover:scale-110 opacity-80 hover:opacity-100'"
              :style="swatchStyle(color)"
              :title="color"
              type="button"
              @click="selectColor(color)"
            />
          </div>
        </UFormField>

        <!-- Location -->
        <UFormField label="Location">
          <UInput
            v-model="formData.location"
            placeholder="Add location"
            icon="i-lucide-map-pin"
            class="w-full"
          />
        </UFormField>

        <!-- Description -->
        <UFormField label="Description">
          <UTextarea
            v-model="formData.description"
            placeholder="Add description"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <!-- Error -->
        <UAlert
          v-if="validationError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :description="validationError"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center gap-2">
        <UButton
          v-if="isEditMode"
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          @click="deleteEvent"
        >
          Delete
        </UButton>
        <div class="flex-1" />
        <UButton
          variant="ghost"
          color="neutral"
          @click="isOpen = false"
        >
          Cancel
        </UButton>
        <UButton
          icon="i-lucide-check"
          @click="save"
        >
          {{ isEditMode ? "Save Changes" : "Add Event" }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
