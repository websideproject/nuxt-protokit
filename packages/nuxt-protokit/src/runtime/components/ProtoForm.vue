<script setup>
import { computed } from 'vue'
import { useProtoExtensionRegistry } from '../composables/useProtoExtensionRegistry'

const { getFieldComponent } = useProtoExtensionRegistry()
const props = defineProps({
  fields: { type: Object, required: true },
  model: { type: Object, required: true },
  sections: { type: Array, required: false },
  cols: { type: Number, required: false, default: 2 },
  computeContext: { type: Object, required: false },
  collectionItems: { type: Object, required: false },
  noCard: { type: Boolean, required: false, default: false },
  errors: { type: Object, required: false },
})
function isVisible(key, fieldDef) {
  if (!fieldDef.showWhen) return true
  const values = {}
  for (const [k, v] of Object.entries(props.model)) {
    values[k] = v.value
  }
  return fieldDef.showWhen(values)
}
function resolveLabel(fieldDef, value) {
  if (typeof fieldDef.label === 'function') return fieldDef.label(value)
  return fieldDef.label
}
const gridClass = computed(() => {
  const colMap = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  }
  return `grid ${colMap[props.cols] || 'md:grid-cols-2'} gap-4`
})
function sectionGridClass(section) {
  const c = section.cols || props.cols
  const colMap = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  }
  return `grid ${colMap[c] || 'md:grid-cols-2'} gap-4`
}
const flatFields = computed(() => {
  if (props.sections) return []
  return Object.entries(props.fields).filter(([key, fd]) => isVisible(key, fd))
})
const sectionedFields = computed(() => {
  if (!props.sections) return []
  return props.sections.map(section => ({
    ...section,
    visibleFields: section.fields.filter(key => props.fields[key] && isVisible(key, props.fields[key])).map(key => ({ key, def: props.fields[key] })),
  }))
})
</script>

<template>
  <!-- Flat mode: single grid -->
  <div
    v-if="!sections"
    :class="gridClass"
  >
    <UFormField
      v-for="[key, fieldDef] in flatFields"
      :key="key"
      :label="resolveLabel(fieldDef, model[key]?.value)"
      :hint="fieldDef.hint"
      :error="errors?.[key]"
      :class="fieldDef.type === 'linked-responses' ? 'col-span-full' : ''"
    >
      <ProtoFieldNumber
        v-if="fieldDef.type === 'number'"
        v-model="model[key].value"
        :placeholder="fieldDef.placeholder"
        :min="fieldDef.min"
        :max="fieldDef.max"
        :step="fieldDef.step"
        :leading="fieldDef.leading"
        :trailing="fieldDef.trailing"
      />
      <ProtoFieldText
        v-else-if="fieldDef.type === 'text'"
        v-model="model[key].value"
        :placeholder="fieldDef.placeholder"
      />
      <ProtoFieldTextarea
        v-else-if="fieldDef.type === 'textarea'"
        v-model="model[key].value"
        :placeholder="fieldDef.placeholder"
      />
      <ProtoFieldSelect
        v-else-if="fieldDef.type === 'select'"
        v-model="model[key].value"
        :options="fieldDef.options"
        :placeholder="fieldDef.placeholder"
      />
      <ProtoFieldRange
        v-else-if="fieldDef.type === 'range'"
        v-model="model[key].value"
        :min="fieldDef.min"
        :max="fieldDef.max"
        :step="fieldDef.step"
        :range-labels="fieldDef.rangeLabels"
      />
      <ProtoFieldTags
        v-else-if="fieldDef.type === 'tags'"
        v-model="model[key].value"
        :placeholder="fieldDef.placeholder"
      />
      <ProtoFieldToggle
        v-else-if="fieldDef.type === 'toggle'"
        v-model="model[key].value"
      />
      <ProtoFieldSegmented
        v-else-if="fieldDef.type === 'segmented'"
        v-model="model[key].value"
        :options="fieldDef.options"
      />
      <ProtoFieldRating
        v-else-if="fieldDef.type === 'rating'"
        v-model="model[key].value"
        :max="fieldDef.max"
      />
      <ProtoFieldDate
        v-else-if="fieldDef.type === 'date'"
        v-model="model[key].value"
        :placeholder="fieldDef.placeholder"
      />
      <ProtoFieldColor
        v-else-if="fieldDef.type === 'color'"
        v-model="model[key].value"
      />
      <ProtoFieldLinkedResponses
        v-else-if="fieldDef.type === 'linked-responses'"
        v-model="model[key].value"
        :field-def="fieldDef"
        :collection-items="collectionItems"
      />
      <component
        :is="getFieldComponent(fieldDef.type)"
        v-else-if="getFieldComponent(fieldDef.type)"
        v-model="model[key].value"
        v-bind="fieldDef.props ?? {}"
      />
      <template
        v-if="fieldDef.help"
        #help
      >
        <span class="text-xs text-muted">{{ fieldDef.help }}</span>
      </template>
    </UFormField>
  </div>

  <!-- Section mode: with cards (default) -->
  <div
    v-else-if="!noCard"
    class="space-y-6"
  >
    <UCard
      v-for="(section, si) in sectionedFields"
      :key="si"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            v-if="section.icon"
            :name="section.icon"
            class="size-5"
          />
          <h3 class="font-semibold">
            {{ section.title }}
          </h3>
        </div>
        <p
          v-if="section.description"
          class="text-sm text-muted mt-1"
        >
          {{ section.description }}
        </p>
      </template>
      <div :class="sectionGridClass(section)">
        <UFormField
          v-for="{ key, def } in section.visibleFields"
          :key="key"
          :label="resolveLabel(def, model[key]?.value)"
          :hint="def.hint"
          :error="errors?.[key]"
          :class="def.type === 'linked-responses' ? 'col-span-full' : ''"
        >
          <ProtoFieldNumber
            v-if="def.type === 'number'"
            v-model="model[key].value"
            :placeholder="def.placeholder"
            :min="def.min"
            :max="def.max"
            :step="def.step"
            :leading="def.leading"
            :trailing="def.trailing"
          />
          <ProtoFieldText
            v-else-if="def.type === 'text'"
            v-model="model[key].value"
            :placeholder="def.placeholder"
          />
          <ProtoFieldTextarea
            v-else-if="def.type === 'textarea'"
            v-model="model[key].value"
            :placeholder="def.placeholder"
          />
          <ProtoFieldSelect
            v-else-if="def.type === 'select'"
            v-model="model[key].value"
            :options="def.options"
            :placeholder="def.placeholder"
          />
          <ProtoFieldRange
            v-else-if="def.type === 'range'"
            v-model="model[key].value"
            :min="def.min"
            :max="def.max"
            :step="def.step"
            :range-labels="def.rangeLabels"
          />
          <ProtoFieldTags
            v-else-if="def.type === 'tags'"
            v-model="model[key].value"
            :placeholder="def.placeholder"
          />
          <ProtoFieldToggle
            v-else-if="def.type === 'toggle'"
            v-model="model[key].value"
          />
          <ProtoFieldSegmented
            v-else-if="def.type === 'segmented'"
            v-model="model[key].value"
            :options="def.options"
          />
          <ProtoFieldRating
            v-else-if="def.type === 'rating'"
            v-model="model[key].value"
            :max="def.max"
          />
          <ProtoFieldDate
            v-else-if="def.type === 'date'"
            v-model="model[key].value"
            :placeholder="def.placeholder"
          />
          <ProtoFieldColor
            v-else-if="def.type === 'color'"
            v-model="model[key].value"
          />
          <ProtoFieldLinkedResponses
            v-else-if="def.type === 'linked-responses'"
            v-model="model[key].value"
            :field-def="def"
            :collection-items="collectionItems"
          />
          <component
            :is="getFieldComponent(def.type)"
            v-else-if="getFieldComponent(def.type)"
            v-model="model[key].value"
            v-bind="def.props ?? {}"
          />
          <template
            v-if="def.help"
            #help
          >
            <span class="text-xs text-muted">{{ def.help }}</span>
          </template>
        </UFormField>
      </div>
    </UCard>
  </div>

  <!-- Section mode: no card (parent provides card wrapper, we just render fields) -->
  <div
    v-else
    class="space-y-4"
  >
    <div
      v-for="(section, si) in sectionedFields"
      :key="si"
      :class="sectionGridClass(section)"
    >
      <UFormField
        v-for="{ key, def } in section.visibleFields"
        :key="key"
        :label="resolveLabel(def, model[key]?.value)"
        :hint="def.hint"
        :error="errors?.[key]"
        :class="def.type === 'linked-responses' ? 'col-span-full' : ''"
      >
        <ProtoFieldNumber
          v-if="def.type === 'number'"
          v-model="model[key].value"
          :placeholder="def.placeholder"
          :min="def.min"
          :max="def.max"
          :step="def.step"
          :leading="def.leading"
          :trailing="def.trailing"
        />
        <ProtoFieldText
          v-else-if="def.type === 'text'"
          v-model="model[key].value"
          :placeholder="def.placeholder"
        />
        <ProtoFieldTextarea
          v-else-if="def.type === 'textarea'"
          v-model="model[key].value"
          :placeholder="def.placeholder"
        />
        <ProtoFieldSelect
          v-else-if="def.type === 'select'"
          v-model="model[key].value"
          :options="def.options"
          :placeholder="def.placeholder"
        />
        <ProtoFieldRange
          v-else-if="def.type === 'range'"
          v-model="model[key].value"
          :min="def.min"
          :max="def.max"
          :step="def.step"
          :range-labels="def.rangeLabels"
        />
        <ProtoFieldTags
          v-else-if="def.type === 'tags'"
          v-model="model[key].value"
          :placeholder="def.placeholder"
        />
        <ProtoFieldToggle
          v-else-if="def.type === 'toggle'"
          v-model="model[key].value"
        />
        <ProtoFieldSegmented
          v-else-if="def.type === 'segmented'"
          v-model="model[key].value"
          :options="def.options"
        />
        <ProtoFieldRating
          v-else-if="def.type === 'rating'"
          v-model="model[key].value"
          :max="def.max"
        />
        <ProtoFieldDate
          v-else-if="def.type === 'date'"
          v-model="model[key].value"
          :placeholder="def.placeholder"
        />
        <ProtoFieldColor
          v-else-if="def.type === 'color'"
          v-model="model[key].value"
        />
        <ProtoFieldLinkedResponses
          v-else-if="def.type === 'linked-responses'"
          v-model="model[key].value"
          :field-def="def"
          :collection-items="collectionItems"
        />
        <component
          :is="getFieldComponent(def.type)"
          v-else-if="getFieldComponent(def.type)"
          v-model="model[key].value"
          v-bind="def.props ?? {}"
        />
        <template
          v-if="def.help"
          #help
        >
          <span class="text-xs text-muted">{{ def.help }}</span>
        </template>
      </UFormField>
    </div>
  </div>
</template>
