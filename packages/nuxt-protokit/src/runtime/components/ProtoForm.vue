<script setup lang="ts">
import type { Ref } from 'vue'
import type { FieldDef, SectionDef } from '../types'
import type { ComputeContext } from '../types/compute'
import { useProtoExtensionRegistry } from '../composables/useProtoExtensionRegistry'

const { getFieldComponent } = useProtoExtensionRegistry()

const props = withDefaults(defineProps<{
  fields: Record<string, FieldDef>
  model: Record<string, Ref>
  sections?: SectionDef[]
  cols?: 1 | 2 | 3 | 4
  computeContext?: ComputeContext
  collectionItems?: Record<string, any[]>
  /** When true, sections render without UCard wrapper (parent is responsible for the card) */
  noCard?: boolean
  /** Field-level validation errors — key is the field name, value is the error message */
  errors?: Record<string, string>
}>(), {
  cols: 2,
  noCard: false,
})

// Get all visible fields (respecting showWhen)
function isVisible(key: string, fieldDef: FieldDef): boolean {
  if (!fieldDef.showWhen) return true
  const values: Record<string, any> = {}
  for (const [k, v] of Object.entries(props.model)) {
    values[k] = v.value
  }
  return (fieldDef as any).showWhen(values)
}

function resolveLabel(fieldDef: FieldDef, value: any): string {
  if (typeof fieldDef.label === 'function') return (fieldDef.label as Function)(value)
  return fieldDef.label
}

const gridClass = computed(() => {
  const colMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  }
  return `grid ${colMap[props.cols] || 'md:grid-cols-2'} gap-4`
})

function sectionGridClass(section: SectionDef) {
  const c = section.cols || props.cols
  const colMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  }
  return `grid ${colMap[c] || 'md:grid-cols-2'} gap-4`
}

// Flat mode: all fields not in sections
const flatFields = computed(() => {
  if (props.sections) return []
  return Object.entries(props.fields).filter(([key, fd]) => isVisible(key, fd))
})

// Section mode
const sectionedFields = computed(() => {
  if (!props.sections) return []
  return props.sections.map(section => ({
    ...section,
    visibleFields: section.fields
      .filter(key => props.fields[key] && isVisible(key, props.fields[key]))
      .map(key => ({ key, def: props.fields[key] })),
  }))
})
</script>

<template>
  <!-- Flat mode: single grid -->
  <div v-if="!sections" :class="gridClass">
    <UFormField
      v-for="[key, fieldDef] in flatFields"
      :key="key"
      :label="resolveLabel(fieldDef, model[key]?.value)"
      :hint="(fieldDef as any).hint"
      :error="errors?.[key]"
      :class="fieldDef.type === 'linked-responses' ? 'col-span-full' : ''"
    >
      <ProtoFieldNumber
        v-if="fieldDef.type === 'number'"
        v-model="model[key].value"
        :placeholder="(fieldDef as any).placeholder"
        :min="(fieldDef as any).min"
        :max="(fieldDef as any).max"
        :step="(fieldDef as any).step"
        :leading="(fieldDef as any).leading"
        :trailing="(fieldDef as any).trailing"
      />
      <ProtoFieldText
        v-else-if="fieldDef.type === 'text'"
        v-model="model[key].value"
        :placeholder="(fieldDef as any).placeholder"
      />
      <ProtoFieldTextarea
        v-else-if="fieldDef.type === 'textarea'"
        v-model="model[key].value"
        :placeholder="(fieldDef as any).placeholder"
      />
      <ProtoFieldSelect
        v-else-if="fieldDef.type === 'select'"
        v-model="model[key].value"
        :options="(fieldDef as any).options"
        :placeholder="(fieldDef as any).placeholder"
      />
      <ProtoFieldRange
        v-else-if="fieldDef.type === 'range'"
        v-model="model[key].value"
        :min="(fieldDef as any).min"
        :max="(fieldDef as any).max"
        :step="(fieldDef as any).step"
        :range-labels="(fieldDef as any).rangeLabels"
      />
      <ProtoFieldTags
        v-else-if="fieldDef.type === 'tags'"
        v-model="model[key].value"
        :placeholder="(fieldDef as any).placeholder"
      />
      <ProtoFieldToggle
        v-else-if="fieldDef.type === 'toggle'"
        v-model="model[key].value"
      />
      <ProtoFieldSegmented
        v-else-if="fieldDef.type === 'segmented'"
        v-model="model[key].value"
        :options="(fieldDef as any).options"
      />
      <ProtoFieldRating
        v-else-if="fieldDef.type === 'rating'"
        v-model="model[key].value"
        :max="(fieldDef as any).max"
      />
      <ProtoFieldDate
        v-else-if="fieldDef.type === 'date'"
        v-model="model[key].value"
        :placeholder="(fieldDef as any).placeholder"
      />
      <ProtoFieldColor
        v-else-if="fieldDef.type === 'color'"
        v-model="model[key].value"
      />
      <ProtoFieldLinkedResponses
        v-else-if="fieldDef.type === 'linked-responses'"
        v-model="model[key].value"
        :field-def="fieldDef as any"
        :collection-items="collectionItems"
      />
      <component
        v-else-if="getFieldComponent(fieldDef.type)"
        :is="getFieldComponent(fieldDef.type)"
        v-model="model[key].value"
        v-bind="(fieldDef as any).props ?? {}"
      />
      <template v-if="(fieldDef as any).help" #help>
        <span class="text-xs text-muted">{{ (fieldDef as any).help }}</span>
      </template>
    </UFormField>
  </div>

  <!-- Section mode: with cards (default) -->
  <div v-else-if="!noCard" class="space-y-6">
    <UCard v-for="(section, si) in sectionedFields" :key="si">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon v-if="section.icon" :name="section.icon" class="size-5" />
          <h3 class="font-semibold">{{ section.title }}</h3>
        </div>
        <p v-if="section.description" class="text-sm text-muted mt-1">{{ section.description }}</p>
      </template>
      <div :class="sectionGridClass(section)">
        <UFormField
          v-for="{ key, def } in section.visibleFields"
          :key="key"
          :label="resolveLabel(def, model[key]?.value)"
          :hint="(def as any).hint"
          :error="errors?.[key]"
          :class="def.type === 'linked-responses' ? 'col-span-full' : ''"
        >
          <ProtoFieldNumber
            v-if="def.type === 'number'"
            v-model="model[key].value"
            :placeholder="(def as any).placeholder"
            :min="(def as any).min"
            :max="(def as any).max"
            :step="(def as any).step"
            :leading="(def as any).leading"
            :trailing="(def as any).trailing"
          />
          <ProtoFieldText
            v-else-if="def.type === 'text'"
            v-model="model[key].value"
            :placeholder="(def as any).placeholder"
          />
          <ProtoFieldTextarea
            v-else-if="def.type === 'textarea'"
            v-model="model[key].value"
            :placeholder="(def as any).placeholder"
          />
          <ProtoFieldSelect
            v-else-if="def.type === 'select'"
            v-model="model[key].value"
            :options="(def as any).options"
            :placeholder="(def as any).placeholder"
          />
          <ProtoFieldRange
            v-else-if="def.type === 'range'"
            v-model="model[key].value"
            :min="(def as any).min"
            :max="(def as any).max"
            :step="(def as any).step"
            :range-labels="(def as any).rangeLabels"
          />
          <ProtoFieldTags
            v-else-if="def.type === 'tags'"
            v-model="model[key].value"
            :placeholder="(def as any).placeholder"
          />
          <ProtoFieldToggle
            v-else-if="def.type === 'toggle'"
            v-model="model[key].value"
          />
          <ProtoFieldSegmented
            v-else-if="def.type === 'segmented'"
            v-model="model[key].value"
            :options="(def as any).options"
          />
          <ProtoFieldRating
            v-else-if="def.type === 'rating'"
            v-model="model[key].value"
            :max="(def as any).max"
          />
          <ProtoFieldDate
            v-else-if="def.type === 'date'"
            v-model="model[key].value"
            :placeholder="(def as any).placeholder"
          />
          <ProtoFieldColor
            v-else-if="def.type === 'color'"
            v-model="model[key].value"
          />
          <ProtoFieldLinkedResponses
            v-else-if="def.type === 'linked-responses'"
            v-model="model[key].value"
            :field-def="def as any"
            :collection-items="collectionItems"
          />
          <component
            v-else-if="getFieldComponent(def.type)"
            :is="getFieldComponent(def.type)"
            v-model="model[key].value"
            v-bind="(def as any).props ?? {}"
          />
          <template v-if="(def as any).help" #help>
            <span class="text-xs text-muted">{{ (def as any).help }}</span>
          </template>
        </UFormField>
      </div>
    </UCard>
  </div>

  <!-- Section mode: no card (parent provides card wrapper, we just render fields) -->
  <div v-else class="space-y-4">
    <div v-for="(section, si) in sectionedFields" :key="si" :class="sectionGridClass(section)">
      <UFormField
        v-for="{ key, def } in section.visibleFields"
        :key="key"
        :label="resolveLabel(def, model[key]?.value)"
        :hint="(def as any).hint"
        :error="errors?.[key]"
        :class="def.type === 'linked-responses' ? 'col-span-full' : ''"
      >
        <ProtoFieldNumber
          v-if="def.type === 'number'"
          v-model="model[key].value"
          :placeholder="(def as any).placeholder"
          :min="(def as any).min"
          :max="(def as any).max"
          :step="(def as any).step"
          :leading="(def as any).leading"
          :trailing="(def as any).trailing"
        />
        <ProtoFieldText
          v-else-if="def.type === 'text'"
          v-model="model[key].value"
          :placeholder="(def as any).placeholder"
        />
        <ProtoFieldTextarea
          v-else-if="def.type === 'textarea'"
          v-model="model[key].value"
          :placeholder="(def as any).placeholder"
        />
        <ProtoFieldSelect
          v-else-if="def.type === 'select'"
          v-model="model[key].value"
          :options="(def as any).options"
          :placeholder="(def as any).placeholder"
        />
        <ProtoFieldRange
          v-else-if="def.type === 'range'"
          v-model="model[key].value"
          :min="(def as any).min"
          :max="(def as any).max"
          :step="(def as any).step"
          :range-labels="(def as any).rangeLabels"
        />
        <ProtoFieldTags
          v-else-if="def.type === 'tags'"
          v-model="model[key].value"
          :placeholder="(def as any).placeholder"
        />
        <ProtoFieldToggle
          v-else-if="def.type === 'toggle'"
          v-model="model[key].value"
        />
        <ProtoFieldSegmented
          v-else-if="def.type === 'segmented'"
          v-model="model[key].value"
          :options="(def as any).options"
        />
        <ProtoFieldRating
          v-else-if="def.type === 'rating'"
          v-model="model[key].value"
          :max="(def as any).max"
        />
        <ProtoFieldDate
          v-else-if="def.type === 'date'"
          v-model="model[key].value"
          :placeholder="(def as any).placeholder"
        />
        <ProtoFieldColor
          v-else-if="def.type === 'color'"
          v-model="model[key].value"
        />
        <ProtoFieldLinkedResponses
          v-else-if="def.type === 'linked-responses'"
          v-model="model[key].value"
          :field-def="def as any"
          :collection-items="collectionItems"
        />
        <component
          v-else-if="getFieldComponent(def.type)"
          :is="getFieldComponent(def.type)"
          v-model="model[key].value"
          v-bind="(def as any).props ?? {}"
        />
        <template v-if="(def as any).help" #help>
          <span class="text-xs text-muted">{{ (def as any).help }}</span>
        </template>
      </UFormField>
    </div>
  </div>
</template>
