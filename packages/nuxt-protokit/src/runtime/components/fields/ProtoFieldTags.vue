<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string[]
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const input = ref('')

function addTag() {
  const val = input.value.trim()
  if (!val) return
  if (props.modelValue.includes(val)) return
  emit('update:modelValue', [...props.modelValue, val])
  input.value = ''
}

function removeTag(index: number) {
  const updated = [...props.modelValue]
  updated.splice(index, 1)
  emit('update:modelValue', updated)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    addTag()
  }
}
</script>

<template>
  <div>
    <div v-if="modelValue.length > 0" class="flex flex-wrap gap-1 mb-3">
      <UBadge
        v-for="(tag, i) in modelValue"
        :key="tag"
        variant="subtle"
        class="cursor-pointer"
        @click="removeTag(i)"
      >
        {{ tag }}
        <UIcon name="i-lucide-x" class="ml-1 size-3" />
      </UBadge>
    </div>
    <UInput
      v-model="input"
      class="w-full"
      :placeholder="placeholder || 'Type and press Enter'"
      @keydown="onKeydown"
    >
      <template #trailing>
        <UButton variant="ghost" size="xs" icon="i-lucide-plus" @click="addTag" />
      </template>
    </UInput>
  </div>
</template>
