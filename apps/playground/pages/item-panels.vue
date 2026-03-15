<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CollectionSchema, TextTemplatePanelDef, TimeSeriesPanelDef, UrlInputPanelDef, CollectionItemPanel } from '#protokit/types'

const schema: CollectionSchema = {
  key: 'playground-item-panels',
  title: 'Content Piece',
  icon: 'i-lucide-file-text',
  itemLabel: item => String(item.title || 'Untitled'),
  editMode: 'inline',
  searchable: true,
  searchFields: ['title', 'keyword'],
  fields: {
    title: { type: 'text', label: 'Title', default: '', placeholder: 'e.g., How to reduce churn' },
    status: {
      type: 'select',
      label: 'Status',
      default: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    keyword: { type: 'text', label: 'Target Keyword', default: '', placeholder: 'e.g., reduce saas churn' },
    wordCount: { type: 'number', label: 'Word Count', default: 0 },
  },
  defaults: { title: '', status: 'draft', keyword: '', wordCount: 0, liveUrl: '', sessions: 0, position: 0, weeklyHistory: [] },
  presets: [
    {
      id: 'starter',
      label: 'Sample Content',
      icon: 'i-lucide-files',
      description: '3 sample articles to explore the panels',
      items: [
        { title: 'How to Reduce SaaS Churn by 40%', status: 'published', keyword: 'reduce saas churn', wordCount: 2400, liveUrl: 'https://example.com/reduce-churn', sessions: 820, position: 6, weeklyHistory: [{ date: '2026-02-24', sessions: 610, position: 9 }, { date: '2026-03-03', sessions: 740, position: 7 }, { date: '2026-03-10', sessions: 820, position: 6 }] },
        { title: 'Pricing Page Best Practices', status: 'published', keyword: 'saas pricing page', wordCount: 1800, liveUrl: 'https://example.com/pricing-best-practices', sessions: 1240, position: 3, weeklyHistory: [{ date: '2026-02-24', sessions: 980, position: 5 }, { date: '2026-03-03', sessions: 1100, position: 4 }, { date: '2026-03-10', sessions: 1240, position: 3 }] },
        { title: 'LTV:CAC Ratio Explained', status: 'draft', keyword: 'ltv cac ratio', wordCount: 900, liveUrl: '', sessions: 0, position: 0, weeklyHistory: [] },
      ],
    },
  ],
}

const urlPanel: UrlInputPanelDef = {
  type: 'url-input',
  id: 'live-url',
  label: 'Live URL',
  icon: 'i-lucide-link',
  field: 'liveUrl',
  placeholder: 'https://yoursite.com/article-slug',
}

const metricsPanel: TimeSeriesPanelDef = {
  type: 'time-series',
  id: 'weekly-metrics',
  label: 'Weekly Metrics',
  icon: 'i-lucide-chart-line',
  historyKey: 'weeklyHistory',
  metrics: [
    { key: 'sessions', label: 'Sessions' },
    { key: 'position', label: 'Avg. Position' },
  ],
}

const templatePanel: TextTemplatePanelDef = {
  type: 'text-template',
  id: 'copy-templates',
  label: 'Copy Templates',
  icon: 'i-lucide-file-pen',
  tip: 'Generated from your title and keyword. Edit freely before publishing.',
  sections: [
    {
      id: 'meta',
      label: 'Meta Description',
      charLimit: 160,
      hint: 'Keep it under 160 characters for best search display.',
      template: item =>
        `Learn ${item.keyword || item.title?.toLowerCase() || 'this topic'} with actionable strategies and real-world examples. ${item.wordCount > 1500 ? 'In-depth guide.' : 'Quick read.'}`.slice(0, 160),
    },
    {
      id: 'tweet',
      label: 'Twitter / X Post',
      charLimit: 280,
      template: item =>
        `🚀 New article: "${item.title || 'Untitled'}"\n\nEverything you need to know about ${item.keyword || 'this topic'} — with practical takeaways you can apply today.\n\n👇 Read it here`,
    },
    {
      id: 'linkedin',
      label: 'LinkedIn Snippet',
      template: item =>
        `I just published a new article on ${item.keyword || item.title?.toLowerCase() || 'this topic'}.\n\nKey takeaways:\n• [Add your first insight]\n• [Add your second insight]\n• [Add your third insight]\n\nTitle: "${item.title || 'Untitled'}" — link in comments.`,
    },
  ],
}

const { doc, items, add, update, remove, isReady } = useProtoCollection(schema)

const selectedIndex = ref<number | null>(null)
const selectedItem = computed(() => selectedIndex.value !== null ? items.value[selectedIndex.value] ?? null : null)

function selectItem(index: number) {
  selectedIndex.value = selectedIndex.value === index ? null : index
}

function handlePanelUpdate(patch: Partial<Record<string, any>>) {
  if (selectedIndex.value === null) return
  update(selectedIndex.value, { ...selectedItem.value, ...patch })
}

const editModalOpen = ref(false)

function saveEdit(item: Record<string, any>) {
  if (selectedIndex.value === null) return
  update(selectedIndex.value, { ...selectedItem.value, ...item })
}

function statusColor(status: string) {
  if (status === 'published') return 'text-emerald-600'
  if (status === 'archived') return 'text-muted'
  return 'text-amber-500'
}
</script>

<template>
  <div class="h-full flex flex-col">
    <ClientOnly>
      <template v-if="isReady">
        <div class="flex flex-1 overflow-hidden">
          <!-- Left: list -->
          <div class="w-72 shrink-0 border-r border-default flex flex-col overflow-hidden">
            <div class="px-4 py-3 border-b border-default flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-file-text" class="size-4 text-primary" />
                <span class="text-sm font-semibold text-highlighted">Content Pieces</span>
                <UBadge variant="subtle" size="sm">{{ items.length }}</UBadge>
              </div>
              <UButton
                size="xs"
                icon="i-lucide-plus"
                variant="ghost"
                @click="add({ title: 'New Article', status: 'draft', keyword: '', wordCount: 0, liveUrl: '', sessions: 0, position: 0, weeklyHistory: [] })"
              />
            </div>

            <div
              v-if="items.length === 0"
              class="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-8 text-center"
            >
              <UIcon name="i-lucide-file-plus" class="size-8 text-muted" />
              <p class="text-sm text-muted">No content pieces yet.</p>
              <UButton
                size="sm"
                variant="outline"
                icon="i-lucide-sparkles"
                @click="() => {
                  const pack = schema.presets![0]
                  pack.items.forEach(item => add(item as Record<string, any>))
                }"
              >
                Load samples
              </UButton>
            </div>

            <div
              v-else
              class="flex-1 overflow-y-auto"
            >
              <button
                v-for="(item, index) in items"
                :key="index"
                class="w-full text-left px-4 py-3 border-b border-default/50 hover:bg-muted/40 transition-colors"
                :class="{ 'bg-primary/5 border-l-2 border-l-primary': selectedIndex === index }"
                @click="selectItem(index)"
              >
                <div class="flex items-start justify-between gap-2">
                  <p class="text-sm font-medium text-highlighted leading-snug line-clamp-2">
                    {{ item.title || 'Untitled' }}
                  </p>
                  <UButton
                    size="xs"
                    icon="i-lucide-trash-2"
                    variant="ghost"
                    color="neutral"
                    class="shrink-0 opacity-0 group-hover:opacity-100"
                    @click.stop="remove(index)"
                  />
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span
                    class="text-xs font-medium capitalize"
                    :class="statusColor(item.status)"
                  >{{ item.status }}</span>
                  <span
                    v-if="item.keyword"
                    class="text-xs text-muted truncate"
                  >· {{ item.keyword }}</span>
                </div>
                <div
                  v-if="item.sessions > 0"
                  class="flex items-center gap-3 mt-1.5"
                >
                  <span class="text-xs text-muted tabular-nums">{{ item.sessions.toLocaleString() }} sessions</span>
                  <span class="text-xs text-muted tabular-nums">pos. {{ item.position }}</span>
                </div>
              </button>
            </div>
          </div>

          <!-- Right: detail panels -->
          <div class="flex-1 overflow-y-auto">
            <template v-if="selectedItem">
              <div class="px-6 py-5 border-b border-default flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-base font-semibold text-highlighted">
                    {{ selectedItem.title || 'Untitled' }}
                  </h2>
                  <p
                    v-if="selectedItem.keyword"
                    class="text-sm text-muted mt-0.5"
                  >
                    Keyword: {{ selectedItem.keyword }}
                  </p>
                </div>
                <UButton
                  size="xs"
                  variant="outline"
                  icon="i-lucide-pencil"
                  @click="editModalOpen = true"
                >
                  Edit
                </UButton>
              </div>

              <ProtoCrudModal
                v-model:open="editModalOpen"
                :schema="schema"
                :edit-data="selectedItem"
                :doc="doc"
                draft-key="item-panels-edit"
                @save="saveEdit"
              />

              <div class="divide-y divide-default">
                <!-- URL -->
                <div>
                  <p class="px-4 pt-3 pb-1 text-xs font-semibold text-muted uppercase tracking-wide">
                    Live URL
                  </p>
                  <ProtoItemPanelUrlInput
                    :panel-def="urlPanel"
                    :item="selectedItem"
                    @update="handlePanelUpdate"
                  />
                </div>

                <!-- Metrics -->
                <div>
                  <p class="px-4 pt-3 pb-1 text-xs font-semibold text-muted uppercase tracking-wide">
                    Weekly Metrics
                  </p>
                  <ProtoItemPanelTimeSeries
                    :panel-def="metricsPanel"
                    :item="selectedItem"
                    :collections="{}"
                    @update="handlePanelUpdate"
                  />
                </div>

                <!-- Copy templates -->
                <div>
                  <p class="px-4 pt-3 pb-1 text-xs font-semibold text-muted uppercase tracking-wide">
                    Copy Templates
                  </p>
                  <ProtoItemPanelTextTemplate
                    :panel-def="templatePanel"
                    :item="selectedItem"
                    :collections="{}"
                  />
                </div>
              </div>
            </template>

            <div
              v-else
              class="flex flex-col items-center justify-center h-full gap-3 text-center px-8 py-16"
            >
              <UIcon name="i-lucide-panel-right-open" class="size-8 text-muted" />
              <p class="text-sm text-muted">Select a content piece to see its detail panels.</p>
            </div>
          </div>
        </div>
      </template>

      <div
        v-else
        class="p-8 space-y-2 animate-pulse"
      >
        <div class="h-10 bg-muted rounded" />
        <div class="h-10 bg-muted rounded" />
        <div class="h-10 bg-muted rounded" />
      </div>

      <template #fallback>
        <div class="p-8 space-y-2 animate-pulse">
          <div class="h-10 bg-muted rounded" />
          <div class="h-10 bg-muted rounded" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
