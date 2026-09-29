<script setup lang="ts">
import { computed } from 'vue'
import { useCalendarContext } from '../../calendar/context'
import { calendarColorStyle, calendarDotClass } from '../../calendar/colors'

// The sidebar's show/hide list. Hidden ids live in the root's `hidden-calendars` model, so a parent
// can persist them
const { calendars, hiddenCalendars } = useCalendarContext()

const items = computed(() => [
  { label: 'Calendars', type: 'label' as const },
  ...calendars.value.map(calendar => ({
    label: calendar.name,
    value: calendar.id,
    color: calendar.color,
    slot: 'calendar' as const,
    // Rendered as a `div` since the link defaults to a `button`, which cannot contain the checkbox
    as: 'div',
  })),
])

function toggle(id: string) {
  hiddenCalendars.value = hiddenCalendars.value.includes(id)
    ? hiddenCalendars.value.filter(hidden => hidden !== id)
    : [...hiddenCalendars.value, id]
}
</script>

<template>
  <UNavigationMenu
    :items="items"
    orientation="vertical"
  >
    <template #calendar="{ item }">
      <!-- A dot rather than the checkbox's own `color`, which only takes the semantic colours -->
      <UCheckbox
        color="neutral"
        :model-value="!hiddenCalendars.includes(item.value!)"
        class="w-full"
        @update:model-value="toggle(item.value!)"
      >
        <template #label>
          <span class="flex items-center gap-2">
            <span
              class="size-2 shrink-0 rounded-full"
              :class="calendarDotClass"
              :style="calendarColorStyle(item.color)"
            />
            {{ item.label }}
          </span>
        </template>
      </UCheckbox>
    </template>
  </UNavigationMenu>
</template>
