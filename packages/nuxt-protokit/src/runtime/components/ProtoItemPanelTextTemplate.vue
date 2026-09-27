<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  panelDef: { type: Object, required: true },
  item: { type: Object, required: true },
  collections: { type: Object, required: true },
})
const ctx = computed(() => ({ collections: props.collections }))
const resolvedSections = computed(
  () => props.panelDef.sections.map(section => ({
    ...section,
    content: section.template(props.item, ctx.value),
  })),
)
const resolvedTip = computed(() => {
  const tip = props.panelDef.tip
  if (!tip) return void 0
  if (typeof tip === 'function') return tip(props.item, ctx.value)
  return tip
})
const localContents = ref({})
function initLocal() {
  const vals = {}
  for (const s of resolvedSections.value) {
    vals[s.id] = s.content
  }
  localContents.value = vals
}
initLocal()
watch(() => props.item._id ?? JSON.stringify(props.item), () => initLocal())
function regenerate() {
  initLocal()
}
async function copySection(id) {
  const text = localContents.value[id] ?? ''
  try {
    await navigator.clipboard.writeText(text)
  }
  catch {
  }
}
function charCount(id) {
  return (localContents.value[id] ?? '').length
}
</script>

<template>
  <div class="border-t border-default px-3 py-3 space-y-3 bg-muted/30">
    <!-- Global tip -->
    <div
      v-if="resolvedTip"
      class="flex gap-2 p-2 rounded bg-info/10 text-info text-xs"
    >
      <UIcon
        name="i-lucide-lightbulb"
        class="size-4 shrink-0 mt-0.5"
      />
      <span>{{ resolvedTip }}</span>
    </div>

    <!-- Sections -->
    <div
      v-for="section in resolvedSections"
      :key="section.id"
      class="space-y-1"
    >
      <div class="flex items-center justify-between">
        <label class="text-xs font-medium text-muted">{{ section.label }}</label>
        <div class="flex items-center gap-1">
          <span
            v-if="section.charLimit"
            class="text-xs tabular-nums"
            :class="charCount(section.id) > section.charLimit ? 'text-error' : 'text-muted'"
          >
            {{ charCount(section.id) }}/{{ section.charLimit }}
          </span>
          <UButton
            size="xs"
            variant="ghost"
            icon="i-lucide-copy"
            @click="copySection(section.id)"
          />
        </div>
      </div>

      <!-- Section tip -->
      <div
        v-if="section.tip"
        class="text-xs text-muted italic"
      >
        {{ section.tip }}
      </div>

      <UTextarea
        v-model="localContents[section.id]"
        :rows="Math.min(8, Math.max(2, (localContents[section.id] ?? '').split('\n').length + 1))"
        class="w-full font-mono text-xs"
        autoresize
      />

      <p
        v-if="section.hint"
        class="text-xs text-muted"
      >
        {{ section.hint }}
      </p>
    </div>

    <!-- Regenerate -->
    <div class="flex justify-end">
      <UButton
        size="xs"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        @click="regenerate"
      >
        Regenerate
      </UButton>
    </div>
  </div>
</template>
