<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  icon: { type: String, required: false },
  description: { type: String, required: false },
  collapsible: { type: Boolean, required: false, default: false },
  defaultOpen: { type: Boolean, required: false, default: true },
})
const isOpen = ref(props.defaultOpen)
</script>

<template>
  <div>
    <div
      class="flex items-center gap-2 mb-3"
      :class="collapsible ? 'cursor-pointer' : ''"
      @click="collapsible ? isOpen = !isOpen : null"
    >
      <UIcon
        v-if="collapsible"
        :name="isOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
        class="size-4 text-muted"
      />
      <UIcon
        v-if="icon"
        :name="icon"
        class="size-5 text-muted"
      />
      <h3 class="font-semibold">
        {{ title }}
      </h3>
    </div>
    <p
      v-if="description && isOpen"
      class="text-sm text-muted mb-3"
    >
      {{ description }}
    </p>
    <div v-show="isOpen">
      <slot />
    </div>
  </div>
</template>
