<script setup lang="ts">
import { computed, ref } from 'vue'
import type * as Y from 'yjs'
import type { Ref, ComputedRef } from 'vue'
import type { PrototypeSchema } from '../types'
import type { ComputeContext } from '../types/compute'
import type { UseProtoListReturn } from '../composables/useProtoList'

const props = defineProps<{
  schema: PrototypeSchema
  state: Record<string, Ref>
  collections: Record<string, UseProtoListReturn<any>>
  computeContext: ComputeContext
  derived: ComputedRef<Record<string, any>>
  doc?: Y.Doc
  collectionItems?: Record<string, any[]>
}>()

defineEmits<{ reset: [] }>()

const hasTabs = computed(() => !!(props.schema.layout?.tabs?.length))

// Build UTabs items: value + slot + label + icon + badge (string)
const tabItems = computed(() => {
  if (!hasTabs.value) return []
  return props.schema.layout!.tabs!.map((tab) => {
    const badge = tab.badge?.(props.computeContext)
    return {
      value: tab.id,
      slot: tab.id,
      label: tab.label,
      icon: tab.icon,
      // UTabs badge is string | number — extract label if badge defined
      ...(badge ? { badge: badge.label } : {}),
    }
  })
})

const activeTab = ref<string>(
  hasTabs.value ? props.schema.layout!.tabs![0].id : '',
)

function colsClass(cols: number) {
  const map: Record<number, string> = { 1: 'grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }
  return `grid ${map[cols] || 'md:grid-cols-2'} gap-6`
}

function spanClass(span?: number) {
  if (!span || span <= 1) return ''
  const map: Record<number, string> = { 2: 'md:col-span-2', 3: 'md:col-span-3', 4: 'md:col-span-4' }
  return map[span] || ''
}
</script>

<template>
  <div
    v-if="schema.layout"
    class="space-y-6"
  >
    <!-- ── Page-level tabs ── -->
    <UTabs
      v-if="hasTabs"
      v-model="activeTab"
      :items="tabItems"
      class="w-full"
    >
      <!-- One content slot per tab, name matches item.slot -->
      <template
        v-for="tab in schema.layout!.tabs!"
        :key="tab.id"
        #[tab.id]
      >
        <div class="space-y-6 mt-6">
          <div
            v-for="(row, ri) in tab.rows"
            :key="ri"
            :class="colsClass(row.cols)"
          >
            <template
              v-for="(item, ii) in row.items"
              :key="ii"
            >
              <!-- Form -->
              <div
                v-if="item.type === 'form'"
                :class="spanClass(item.span)"
              >
                <UCard>
                  <template
                    v-if="item.sectionIndex != null && schema.sections?.[item.sectionIndex]"
                    #header
                  >
                    <div class="flex items-center gap-2">
                      <UIcon
                        v-if="schema.sections[item.sectionIndex].icon"
                        :name="schema.sections[item.sectionIndex].icon!"
                        class="size-5 text-muted"
                      />
                      <h3 class="font-semibold">
                        {{ schema.sections[item.sectionIndex].title }}
                      </h3>
                    </div>
                  </template>
                  <ProtoForm
                    :fields="schema.fields"
                    :model="state"
                    :sections="item.sectionIndex != null && schema.sections ? [schema.sections[item.sectionIndex]] : schema.sections"
                    :cols="schema.defaultCols"
                    :collection-items="collectionItems"
                    no-card
                  />
                </UCard>
              </div>

              <!-- Stats -->
              <div
                v-else-if="item.type === 'stats' && schema.results?.[item.resultIndex]"
                :class="spanClass(item.span)"
              >
                <UCard v-if="!schema.results[item.resultIndex].showWhen || schema.results[item.resultIndex].showWhen!(computeContext)">
                  <template #header>
                    <div class="flex items-center justify-between">
                      <h3 class="font-semibold">
                        {{ schema.results[item.resultIndex].title }}
                      </h3>
                      <ProtoBadge
                        v-if="schema.results[item.resultIndex].badge?.(computeContext)"
                        v-bind="schema.results[item.resultIndex].badge!(computeContext)!"
                      />
                    </div>
                  </template>
                  <ProtoStatGrid
                    :stats="schema.results[item.resultIndex].stats(computeContext)"
                    :cols="schema.results[item.resultIndex].statCols"
                  />
                </UCard>
                <UCard v-else>
                  <template #header>
                    <h3 class="font-semibold text-muted">
                      {{ schema.results[item.resultIndex].title }}
                    </h3>
                  </template>
                  <p class="text-sm text-muted py-2">
                    Not enough data yet.
                  </p>
                </UCard>
              </div>

              <!-- Viz -->
              <div
                v-else-if="item.type === 'viz' && schema.visualizations?.[item.vizIndex]"
                :class="spanClass(item.span)"
              >
                <UCard
                  v-if="!schema.visualizations[item.vizIndex].showWhen || schema.visualizations[item.vizIndex].showWhen!(computeContext)"
                >
                  <ProtoViz
                    :viz="schema.visualizations[item.vizIndex]"
                    :context="computeContext"
                  />
                </UCard>
              </div>

              <!-- Card -->
              <div
                v-else-if="item.type === 'card' && schema.cards?.[item.cardIndex]"
                :class="spanClass(item.span)"
              >
                <ProtoCard
                  :title="schema.cards[item.cardIndex].title"
                  :icon="schema.cards[item.cardIndex].icon"
                  :description="schema.cards[item.cardIndex].description"
                  :stats="schema.cards[item.cardIndex].stats?.(computeContext)"
                  :badge="schema.cards[item.cardIndex].badge?.(computeContext)"
                  :footer="schema.cards[item.cardIndex].footer"
                />
              </div>

              <!-- Collection -->
              <div
                v-else-if="item.type === 'collection' && collections[item.collectionKey]"
                :class="spanClass(item.span)"
              >
                <VizCollectionCalendar
                  v-if="item.view === 'calendar'"
                  :items="collections[item.collectionKey].items.value"
                  :config="(item as any).calendarConfig"
                  :on-update="(idx, val) => collections[item.collectionKey].update(idx, val)"
                />
                <UCard v-else>
                  <ProtoCrudList
                    v-if="item.view === 'list'"
                    :schema="schema.collections![item.collectionKey]"
                    :items="collections[item.collectionKey].items.value"
                    :doc="doc"
                    :collection-items="collectionItems"
                    @add="collections[item.collectionKey].add($event)"
                    @update="(idx, val) => collections[item.collectionKey].update(idx, val)"
                    @remove="collections[item.collectionKey].remove($event)"
                  />
                  <ProtoCrudTable
                    v-else
                    :schema="schema.collections![item.collectionKey]"
                    :items="collections[item.collectionKey].items.value"
                    @update="(idx, val) => collections[item.collectionKey].update(idx, val)"
                    @remove="collections[item.collectionKey].remove($event)"
                  />
                </UCard>
              </div>

              <!-- Inline tabs -->
              <div
                v-else-if="item.type === 'tabs'"
                :class="spanClass(item.span)"
              >
                <UTabs
                  :items="item.tabs.map(t => ({ value: t.id, slot: t.id, label: t.label, icon: t.icon }))"
                >
                  <template
                    v-for="inlineTab in item.tabs"
                    :key="inlineTab.id"
                    #[inlineTab.id]
                  >
                    <div class="space-y-4 mt-4">
                      <template
                        v-for="(subItem, si) in inlineTab.items"
                        :key="si"
                      >
                        <div v-if="subItem.type === 'collection' && collections[subItem.collectionKey]">
                          <UCard>
                            <ProtoCrudList
                              v-if="subItem.view === 'list'"
                              :schema="schema.collections![subItem.collectionKey]"
                              :items="collections[subItem.collectionKey].items.value"
                              :doc="doc"
                              :collection-items="collectionItems"
                              @add="collections[subItem.collectionKey].add($event)"
                              @update="(idx, val) => collections[subItem.collectionKey].update(idx, val)"
                              @remove="collections[subItem.collectionKey].remove($event)"
                            />
                          </UCard>
                        </div>
                        <UCard v-else-if="subItem.type === 'stats' && schema.results?.[subItem.resultIndex]">
                          <ProtoStatGrid
                            :stats="schema.results[subItem.resultIndex].stats(computeContext)"
                            :cols="schema.results[subItem.resultIndex].statCols"
                          />
                        </UCard>
                        <UCard
                          v-else-if="subItem.type === 'viz' && schema.visualizations?.[subItem.vizIndex]
                            && (!schema.visualizations[subItem.vizIndex].showWhen || schema.visualizations[subItem.vizIndex].showWhen!(computeContext))"
                        >
                          <ProtoViz
                            :viz="schema.visualizations[subItem.vizIndex]"
                            :context="computeContext"
                          />
                        </UCard>
                      </template>
                    </div>
                  </template>
                </UTabs>
              </div>

              <!-- Section -->
              <div
                v-else-if="item.type === 'section'"
                :class="spanClass(item.span)"
              >
                <ProtoSection :title="item.title">
                  <slot :name="`section-${item.title}`" />
                </ProtoSection>
              </div>
            </template>
          </div>
        </div>
      </template>
    </UTabs>

    <!-- ── Flat layout (no tabs) ── -->
    <template v-if="!hasTabs && schema.layout!.rows">
      <div
        v-for="(row, ri) in schema.layout!.rows"
        :key="ri"
        :class="colsClass(row.cols)"
      >
        <template
          v-for="(item, ii) in row.items"
          :key="ii"
        >
          <div
            v-if="item.type === 'form'"
            :class="spanClass(item.span)"
          >
            <UCard>
              <template
                v-if="item.sectionIndex != null && schema.sections?.[item.sectionIndex]"
                #header
              >
                <div class="flex items-center gap-2">
                  <UIcon
                    v-if="schema.sections[item.sectionIndex].icon"
                    :name="schema.sections[item.sectionIndex].icon!"
                    class="size-5 text-muted"
                  />
                  <h3 class="font-semibold">
                    {{ schema.sections[item.sectionIndex].title }}
                  </h3>
                </div>
              </template>
              <ProtoForm
                :fields="schema.fields"
                :model="state"
                :sections="item.sectionIndex != null && schema.sections ? [schema.sections[item.sectionIndex]] : schema.sections"
                :cols="schema.defaultCols"
                :collection-items="collectionItems"
                no-card
              />
            </UCard>
          </div>

          <div
            v-else-if="item.type === 'stats' && schema.results?.[item.resultIndex]"
            :class="spanClass(item.span)"
          >
            <UCard v-if="!schema.results[item.resultIndex].showWhen || schema.results[item.resultIndex].showWhen!(computeContext)">
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="font-semibold">
                    {{ schema.results[item.resultIndex].title }}
                  </h3>
                  <ProtoBadge
                    v-if="schema.results[item.resultIndex].badge?.(computeContext)"
                    v-bind="schema.results[item.resultIndex].badge!(computeContext)!"
                  />
                </div>
              </template>
              <ProtoStatGrid
                :stats="schema.results[item.resultIndex].stats(computeContext)"
                :cols="schema.results[item.resultIndex].statCols"
              />
            </UCard>
          </div>

          <div
            v-else-if="item.type === 'viz' && schema.visualizations?.[item.vizIndex]"
            :class="spanClass(item.span)"
          >
            <UCard v-if="!schema.visualizations[item.vizIndex].showWhen || schema.visualizations[item.vizIndex].showWhen!(computeContext)">
              <ProtoViz
                :viz="schema.visualizations[item.vizIndex]"
                :context="computeContext"
              />
            </UCard>
          </div>

          <div
            v-else-if="item.type === 'card' && schema.cards?.[item.cardIndex]"
            :class="spanClass(item.span)"
          >
            <ProtoCard
              :title="schema.cards[item.cardIndex].title"
              :icon="schema.cards[item.cardIndex].icon"
              :description="schema.cards[item.cardIndex].description"
              :stats="schema.cards[item.cardIndex].stats?.(computeContext)"
              :badge="schema.cards[item.cardIndex].badge?.(computeContext)"
              :footer="schema.cards[item.cardIndex].footer"
            />
          </div>

          <div
            v-else-if="item.type === 'collection' && collections[item.collectionKey]"
            :class="spanClass(item.span)"
          >
            <VizCollectionCalendar
              v-if="item.view === 'calendar'"
              :items="collections[item.collectionKey].items.value"
              :config="(item as any).calendarConfig"
              :on-update="(idx, val) => collections[item.collectionKey].update(idx, val)"
            />
            <UCard v-else>
              <ProtoCrudList
                v-if="item.view === 'list'"
                :schema="schema.collections![item.collectionKey]"
                :items="collections[item.collectionKey].items.value"
                :doc="doc"
                :collection-items="collectionItems"
                @add="collections[item.collectionKey].add($event)"
                @update="(idx, val) => collections[item.collectionKey].update(idx, val)"
                @remove="collections[item.collectionKey].remove($event)"
              />
              <ProtoCrudTable
                v-else
                :schema="schema.collections![item.collectionKey]"
                :items="collections[item.collectionKey].items.value"
                @update="(idx, val) => collections[item.collectionKey].update(idx, val)"
                @remove="collections[item.collectionKey].remove($event)"
              />
            </UCard>
          </div>

          <div
            v-else-if="item.type === 'section'"
            :class="spanClass(item.span)"
          >
            <ProtoSection :title="item.title">
              <slot :name="`section-${item.title}`" />
            </ProtoSection>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
