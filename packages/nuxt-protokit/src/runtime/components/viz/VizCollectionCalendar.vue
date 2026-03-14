<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CalendarEvent, CalendarColor } from '../../types/calendar'
import type { CollectionCalendarConfig } from '../../types/brick'

const props = defineProps<{
  items: any[]
  config: CollectionCalendarConfig
  onUpdate?: (index: number, item: any) => void
}>()

const emit = defineEmits<{
  'event-click': [id: string]
  'day-click': [date: string]
}>()

const currentDate = ref(new Date())
const view = ref<'month' | 'week'>('month')

const idField = computed(() => props.config.idField ?? '_id')

function itemToEvent(item: any): CalendarEvent | null {
  const date = item[props.config.dateField] || (props.config.endDateField && item[props.config.endDateField])
  if (!date) return null

  const isAllDay = props.config.allDayField ? item[props.config.allDayField] !== false : true
  const timeField = props.config.timeField
  const endTimeField = props.config.endTimeField

  const startAt = (!isAllDay && timeField && item[timeField])
    ? `${date}T${item[timeField]}:00`
    : `${date}T00:00:00`

  const endDate = props.config.endDateField ? (item[props.config.endDateField] || date) : date
  const endAt = (!isAllDay && endTimeField && item[endTimeField])
    ? `${endDate}T${item[endTimeField]}:00`
    : `${endDate}T23:59:59`

  const status = item.status as string | undefined
  const color: CalendarColor = (status && props.config.statusColorMap?.[status])
    || props.config.defaultColor
    || 'neutral'

  return {
    id: item[idField.value],
    title: item[props.config.titleField] || 'Untitled',
    startAt,
    endAt,
    allDay: isAllDay,
    color,
    description: '',
    location: '',
    linkedTaskId: '',
  }
}

const events = computed<CalendarEvent[]>(() =>
  props.items.flatMap((item) => {
    const event = itemToEvent(item)
    return event ? [event] : []
  }),
)

function findIndex(id: string): number {
  return props.items.findIndex(item => item[idField.value] === id)
}

function onEventClick(event: CalendarEvent) {
  emit('event-click', event.id)
}

function onEventMove(id: string, newStartAt: string, newEndAt: string) {
  const idx = findIndex(id)
  if (idx === -1) return
  const item = props.items[idx]
  const isAllDay = props.config.allDayField ? item[props.config.allDayField] !== false : true
  const patch: Record<string, any> = { [props.config.dateField]: newStartAt.split('T')[0] }
  if (!isAllDay && props.config.timeField) {
    patch[props.config.timeField] = newStartAt.split('T')[1]?.slice(0, 5) ?? ''
    if (props.config.endTimeField)
      patch[props.config.endTimeField] = newEndAt.split('T')[1]?.slice(0, 5) ?? ''
  }
  props.onUpdate?.(idx, { ...item, ...patch })
}

function onEventUpdate(id: string, patch: Partial<CalendarEvent>) {
  const idx = findIndex(id)
  if (idx === -1) return
  const item = props.items[idx]
  if (patch.allDay === true && props.config.allDayField) {
    props.onUpdate?.(idx, {
      ...item,
      [props.config.allDayField]: true,
      [props.config.dateField]: patch.startAt?.split('T')[0] ?? item[props.config.dateField],
      ...(props.config.timeField ? { [props.config.timeField]: '' } : {}),
      ...(props.config.endTimeField ? { [props.config.endTimeField]: '' } : {}),
    })
  }
  else if (patch.allDay === false && patch.startAt && props.config.allDayField) {
    props.onUpdate?.(idx, {
      ...item,
      [props.config.allDayField]: false,
      [props.config.dateField]: patch.startAt.split('T')[0],
      ...(props.config.timeField ? { [props.config.timeField]: patch.startAt.split('T')[1]?.slice(0, 5) ?? '' } : {}),
      ...(props.config.endTimeField ? { [props.config.endTimeField]: patch.endAt?.split('T')[1]?.slice(0, 5) ?? '' } : {}),
    })
  }
}

function onDayClick(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  emit('day-click', `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`)
}

function navigatePrev() {
  const d = new Date(currentDate.value)
  if (view.value === 'week') d.setDate(d.getDate() - 7)
  else d.setMonth(d.getMonth() - 1, 1)
  currentDate.value = d
}

function navigateNext() {
  const d = new Date(currentDate.value)
  if (view.value === 'week') d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1, 1)
  currentDate.value = d
}

const title = computed(() =>
  view.value === 'week' ? formatWeekTitle(currentDate.value) : formatMonthTitle(currentDate.value),
)

const undatedItems = computed(() =>
  props.items.filter(item => !item[props.config.dateField]),
)
</script>

<template>
  <div
    class="flex flex-col gap-4"
    style="height: calc(100vh - 280px); min-height: 480px;"
  >
    <!-- Navigation bar -->
    <div class="flex items-center gap-1 shrink-0">
      <UButton
        icon="i-lucide-chevron-left"
        variant="ghost"
        color="neutral"
        size="sm"
        @click="navigatePrev"
      />
      <UButton
        variant="ghost"
        color="neutral"
        size="sm"
        @click="currentDate = new Date()"
      >
        Today
      </UButton>
      <UButton
        icon="i-lucide-chevron-right"
        variant="ghost"
        color="neutral"
        size="sm"
        @click="navigateNext"
      />
      <h2 class="flex-1 text-base font-semibold text-highlighted px-1">
        {{ title }}
      </h2>
      <div class="flex">
        <UButton
          icon="i-lucide-calendar-days"
          size="sm"
          :variant="view === 'month' ? 'solid' : 'ghost'"
          color="neutral"
          class="rounded-r-none"
          @click="view = 'month'"
        >
          Month
        </UButton>
        <UButton
          icon="i-lucide-calendar-range"
          size="sm"
          :variant="view === 'week' ? 'solid' : 'ghost'"
          color="neutral"
          class="rounded-l-none -ml-px"
          @click="view = 'week'"
        >
          Week
        </UButton>
      </div>
    </div>

    <ProtoCalendarMonth
      v-if="view === 'month'"
      :events="events"
      :current-date="currentDate"
      class="flex-1 overflow-hidden border border-default rounded-lg"
      @day-click="onDayClick"
      @event-click="onEventClick"
      @event-move="onEventMove"
    />

    <ProtoCalendarWeek
      v-else
      :events="events"
      :current-date="currentDate"
      class="flex-1 overflow-hidden border border-default rounded-lg"
      @event-click="onEventClick"
      @event-move="onEventMove"
      @event-update="onEventUpdate"
    />

    <!-- Undated items (month view only) -->
    <div
      v-if="view === 'month' && undatedItems.length"
      class="shrink-0"
    >
      <p class="text-sm font-medium text-muted mb-2 flex items-center gap-1">
        <UIcon
          name="i-lucide-calendar-x"
          class="w-4 h-4"
        />
        Without a date ({{ undatedItems.length }})
      </p>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <button
          v-for="item in undatedItems"
          :key="item[idField]"
          class="text-left p-2 border border-default rounded-lg hover:bg-elevated transition-colors"
          @click="emit('event-click', item[idField])"
        >
          <p class="text-sm font-medium text-highlighted truncate">
            {{ item[config.titleField] || 'Untitled' }}
          </p>
          <UBadge
            v-if="item.status"
            :color="config.statusColorMap?.[item.status] ?? 'neutral'"
            variant="soft"
            size="sm"
            class="mt-1"
          >
            {{ item.status }}
          </UBadge>
        </button>
      </div>
    </div>

    <div
      v-if="items.length === 0"
      class="text-center py-10 text-muted"
    >
      <UIcon
        name="i-lucide-calendar"
        class="h-10 w-10 mx-auto mb-3 opacity-30"
      />
      <p class="text-sm">
        No items yet.
      </p>
    </div>
  </div>
</template>
