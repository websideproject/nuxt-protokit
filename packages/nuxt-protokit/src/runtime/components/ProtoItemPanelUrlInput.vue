<script setup lang="ts">
import { ref, watch } from 'vue'
import type { UrlInputPanelDef } from '../types/schema'

const props = defineProps<{
  panelDef: UrlInputPanelDef
  item: Record<string, any>
}>()

const emit = defineEmits<{
  update: [patch: Partial<Record<string, any>>]
}>()

const localUrl = ref<string>(props.item[props.panelDef.field] ?? '')

watch(() => props.item[props.panelDef.field], (val) => {
  localUrl.value = val ?? ''
})

function save() {
  const patch = props.panelDef.onConfirm
    ? props.panelDef.onConfirm(localUrl.value, props.item)
    : { [props.panelDef.field]: localUrl.value }
  emit('update', patch)
}
</script>

<template>
  <div class="border-t border-default px-3 py-3 bg-muted/30">
    <div class="flex gap-2 items-center">
      <UInput
        v-model="localUrl"
        class="flex-1"
        :placeholder="panelDef.placeholder || 'Enter URL...'"
        type="url"
        size="sm"
        @keydown.enter="save"
      />
      <UButton
        size="sm"
        icon="i-lucide-check"
        @click="save"
      >
        Save
      </UButton>
    </div>
  </div>
</template>
