<script setup lang="ts">
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue'
import { DEFAULT_TITLE, useCalendarContext } from '../../calendar/context'
import { calendarColorStyle, calendarDotClass, eventBlockClass, eventChipCompactClass } from '../../calendar/colors'
import EventForm from './ProtoCalendarEventForm.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  // A block in the time grid, or a pill in a month cell and the all-day row
  variant: 'block' | 'chip'
  // The segment the popover hangs off. An all-day draft spanning two month rows draws twice and only
  // the one holding its start owns the form
  anchored?: boolean
  continuesBefore?: boolean
  continuesAfter?: boolean
}>()

const {
  formSide, format, colorOf, draft, draftOpen, pendingScroll,
  updateDraft, discardDraft, commitDraft, registerDraftAnchor,
} = useCalendarContext()

// Every segment counts: the draft is committed once none of them is left, so switching view or
// scrolling its day away takes it with it
registerDraftAnchor()

const colorStyle = computed(() => calendarColorStyle(colorOf(draft.value ?? {})))
const title = computed(() => draft.value?.title || DEFAULT_TITLE)
const times = computed(() => draft.value && !draft.value.allDay
  ? `${format.value.time(draft.value.start)} – ${format.value.time(draft.value.end)}`
  : null)

// There is nothing to press: closing the form is what saves the draft, the way the inspector commits
// what it is showing. Escape is the way out, and the only close that hands the focus back to where the
// draft came from
let dismissedByEscape = false

const content = computed(() => ({
  side: formSide.value,
  sideOffset: 8,
  collisionPadding: 16,
  onEscapeKeyDown: () => {
    dismissedByEscape = true
  },
}))

function onUpdateOpen(value: boolean) {
  if (value) {
    return
  }

  if (dismissedByEscape) {
    discardDraft(true)
  }
  else {
    commitDraft()
  }

  dismissedByEscape = false
}

const el = useTemplateRef('el')

// The `+` button draws on the date the calendar is on, which can be an hour or a month row away from
// what is on screen
function reveal() {
  if (!props.anchored || !pendingScroll.value) {
    return
  }

  pendingScroll.value = false

  // `nearest` honours the scroller's top padding, so the ghost lands under the chrome rather than
  // behind it
  nextTick(() => el.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
}

onMounted(reveal)
watch(pendingScroll, reveal)
</script>

<template>
  <!-- The anchor slot rather than the trigger: `PopoverAnchor` binds no handlers, so pressing the ghost
    cannot toggle the form it belongs to -->
  <UPopover
    :open="!!anchored && draftOpen"
    :content="content"
    :ui="{ content: 'p-2 w-80 max-w-[calc(100vw-2rem)]' }"
    @update:open="onUpdateOpen"
  >
    <template #anchor>
      <!-- Dressed as the event it is about to be, with its form open: the chip wears the held shade a
        selected chip does, and only an all-day one the tinted pill, so nothing changes about it when
        Enter saves it -->
      <div
        ref="el"
        v-bind="$attrs"
        data-draft
        :data-active="variant === 'chip' || undefined"
        aria-hidden="true"
        class="select-none transition-colors"
        :class="[
          variant === 'block'
            ? [eventBlockClass, 'absolute z-20 flex flex-col items-start overflow-hidden rounded-xs px-3 py-1 text-xs text-start']
            : [
              'flex items-center gap-1.5 min-w-0 rounded-full px-1.5 py-0.5 text-xs',
              draft?.allDay
                ? eventBlockClass
                : ['text-default data-active:bg-elevated', eventChipCompactClass],
            ],
          continuesBefore && 'rounded-s-none',
          continuesAfter && 'rounded-e-none',
        ]"
        :style="colorStyle"
        @pointerdown.stop
      >
        <span
          v-if="variant === 'block'"
          class="absolute inset-s-1 inset-y-1 w-1 rounded-full"
          :class="calendarDotClass"
        />
        <span
          v-else-if="draft?.allDay"
          :class="calendarDotClass"
          class="rounded-full flex items-center justify-center p-0.5 -mx-0.75"
        >
          <UIcon
            name="i-lucide-calendar"
            class="size-2.5 shrink-0 text-inverted"
          />
        </span>
        <span
          v-else
          class="max-lg:hidden size-2 shrink-0 rounded-full"
          :class="calendarDotClass"
        />

        <span
          class="font-medium truncate"
          :class="variant === 'block' && 'w-full'"
        >{{ title }}</span>

        <span
          v-if="times && draft"
          class="truncate tabular-nums"
          :class="variant === 'block' ? 'w-full opacity-80' : 'ms-auto shrink-0 text-muted text-[11px]'"
        >{{ variant === 'block' ? times : format.time(draft.start) }}</span>
      </div>
    </template>

    <template #content>
      <EventForm
        v-if="draft"
        :draft="draft"
        @update="updateDraft"
        @submit="commitDraft(true)"
        @escape="discardDraft(true)"
      />
    </template>
  </UPopover>
</template>
