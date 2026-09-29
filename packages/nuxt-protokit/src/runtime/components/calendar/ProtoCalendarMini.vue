<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { computed } from 'vue'
import { useCalendarContext } from '../../calendar/context'

const { date, weekStartsOn, setDate } = useCalendarContext()

const model = computed({
  get: () => date.value,
  set(value: CalendarDate | null | undefined) {
    if (value) {
      setDate(value)
    }
  },
})
</script>

<template>
  <UCalendar
    v-model="model"
    :week-starts-on="weekStartsOn"
    :year-controls="false"
    size="xs"
    fixed-weeks
  />
</template>
