<script setup lang="ts">
import type { CollectionSchema } from '#protokit/types'

const schema: CollectionSchema = {
  key: 'playground-competitors',
  title: 'Competitor Tracker',
  icon: 'i-lucide-users',
  searchable: true,
  searchFields: ['name', 'category'],
  itemLabel: (item: Record<string, unknown>) => String(item.name || 'Unnamed'),
  listDisplay: {
    primaryField: 'name',
    secondaryField: 'url',
    badgeField: 'category',
  },
  fields: {
    name: { type: 'text', label: 'Company Name', default: '', placeholder: 'e.g., Acme Corp' },
    url: { type: 'text', label: 'Website', default: '', placeholder: 'https://...' },
    category: {
      type: 'select',
      label: 'Category',
      default: 'Direct',
      options: ['Direct', 'Indirect', 'Potential'],
    },
    pricing: { type: 'number', label: 'Starting Price', default: 0, leading: '$', trailing: '/mo' },
    threat: {
      type: 'rating',
      label: 'Threat Level',
      default: 3,
      max: 5,
    },
    notes: { type: 'textarea', label: 'Notes', default: '', placeholder: 'Key differentiators, strengths...' },
  },
  defaults: {
    name: '',
    url: '',
    category: 'Direct',
    pricing: 0,
    threat: 3,
    notes: '',
  },
  tableColumns: [
    { key: 'name', label: 'Company', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'pricing', label: 'Price', sortable: true, format: 'money' },
    { key: 'threat', label: 'Threat' },
  ],
}

const { doc, items, add, update, remove, move, isReady } = useProtoCollection(schema)
</script>

<template>
  <div class="max-w-3xl mx-auto px-6 py-8">
      <ClientOnly>
        <div v-if="isReady">
          <ProtoCrudList
            :schema="schema"
            :items="items"
            :doc="doc"
            @add="add"
            @update="(index, item) => update(index, item)"
            @remove="remove"
            @move="(from, to) => move(from, to)"
          />
        </div>
        <div v-else class="space-y-2 animate-pulse">
          <div class="h-10 bg-muted rounded" />
          <div class="h-12 bg-muted rounded" />
          <div class="h-12 bg-muted rounded" />
        </div>
        <template #fallback>
          <div class="space-y-2 animate-pulse">
            <div class="h-10 bg-muted rounded" />
            <div class="h-12 bg-muted rounded" />
          </div>
        </template>
      </ClientOnly>
  </div>
</template>
