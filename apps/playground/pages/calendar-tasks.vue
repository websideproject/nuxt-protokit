<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAutoAnimate } from '@formkit/auto-animate/vue'
import type { CalendarView, CalendarColor } from '#protokit/types'
import { formatDayTitle, formatMonthTitle, formatWeekTitle } from '#protokit/utils/calendarLayout'

// ── Calendar events ───────────────────────────────────────────────────────────
const { doc, events, addEvent, updateEvent, removeEvent, moveEvent, isReady } = useProtoCalendar({
  docKey: 'calendar-tasks-demo',
})

// ── Tasks (co-located in the same Y.Doc) ─────────────────────────────────────
interface Task {
  id: string
  title: string
  done: boolean
  color: CalendarColor
}

const TASK_DEFAULTS: Task = { id: '', title: '', done: false, color: 'sky' }
const TASK_COLORS: CalendarColor[] = ['sky', 'violet', 'rose', 'emerald', 'amber', 'blue', 'teal', 'orange']

const taskList = useProtoList<Task>(doc, 'demo:tasks', {
  defaults: TASK_DEFAULTS,
  waitFor: isReady,
})

function addTask() {
  if (!newTaskTitle.value.trim()) return
  taskList.add({
    id: crypto.randomUUID(),
    title: newTaskTitle.value.trim(),
    done: false,
    color: TASK_COLORS[taskList.items.value.length % TASK_COLORS.length] as CalendarColor,
  })
  newTaskTitle.value = ''
}

function toggleTask(task: Task) {
  const idx = taskList.items.value.findIndex(t => t.id === task.id)
  if (idx !== -1) taskList.update(idx, { done: !task.done })
}

function deleteTask(task: Task) {
  const idx = taskList.items.value.findIndex(t => t.id === task.id)
  if (idx !== -1) taskList.remove(idx)
}

function cycleColor(task: Task) {
  const idx = taskList.items.value.findIndex(t => t.id === task.id)
  if (idx === -1) return
  const next = (TASK_COLORS.indexOf(task.color) + 1) % TASK_COLORS.length
  taskList.update(idx, { color: TASK_COLORS[next] as CalendarColor })
}

const newTaskTitle = ref('')
// Set of task ids that already have a linked calendar event
const scheduledTaskIds = computed(() =>
  new Set(events.value.map(e => e.linkedTaskId).filter(Boolean)),
)

const pendingTasks = computed(() => taskList.items.value.filter(t => !t.done))
const doneTasks = computed(() => taskList.items.value.filter(t => t.done))

// ── Calendar state ────────────────────────────────────────────────────────────
const currentView = ref<CalendarView>('month')
const currentDate = ref(new Date())

function navigatePrev() {
  const d = new Date(currentDate.value)
  if (currentView.value === 'month') d.setMonth(d.getMonth() - 1)
  else if (currentView.value === 'week') d.setDate(d.getDate() - 7)
  else d.setDate(d.getDate() - 1)
  currentDate.value = d
}

function navigateNext() {
  const d = new Date(currentDate.value)
  if (currentView.value === 'month') d.setMonth(d.getMonth() + 1)
  else if (currentView.value === 'week') d.setDate(d.getDate() + 7)
  else d.setDate(d.getDate() + 1)
  currentDate.value = d
}

const viewTitle = computed(() => {
  if (currentView.value === 'month') return formatMonthTitle(currentDate.value)
  if (currentView.value === 'week') return formatWeekTitle(currentDate.value)
  return formatDayTitle(currentDate.value)
})

// ── Task drag → calendar ──────────────────────────────────────────────────────
// Store the dragging task in a ref so we don't rely on dataTransfer parsing
const draggingTask = ref<Task | null>(null)

function onTaskDragStart(e: DragEvent, task: Task) {
  if (scheduledTaskIds.value.has(task.id)) {
    e.preventDefault()
    return
  }
  draggingTask.value = task
  e.dataTransfer!.effectAllowed = 'copy'
  e.dataTransfer!.setData('application/x-task', JSON.stringify(task))
  e.dataTransfer!.setData('text/plain', JSON.stringify(task))
}

function onTaskDragEnd() {
  draggingTask.value = null
}

// Unified handler for all views — (startAt, endAt, allDay, data) signature
function onExternalDrop(startAt: string, endAt: string, allDay: boolean, rawData: string) {
  // Prefer the in-memory ref (more reliable than dataTransfer parsing)
  let task: Task | null = draggingTask.value
  if (!task) {
    try { task = JSON.parse(rawData) }
    catch { return }
  }
  if (!task?.title) return

  addEvent({
    title: task.title,
    startAt,
    endAt,
    allDay,
    color: task.color ?? 'sky',
    description: '',
    location: '',
    linkedTaskId: task.id,
  })
  draggingTask.value = null
}

// ── Event modal ───────────────────────────────────────────────────────────────
const isModalOpen = ref(false)
const selectedEvent = ref<any>(null)
const newEventDefaults = ref<any>({})

function onEventClick(event: any) {
  selectedEvent.value = event
  newEventDefaults.value = {}
  isModalOpen.value = true
}

function onRangeSelect(startAt: string, endAt: string) {
  newEventDefaults.value = { startAt, endAt }
  selectedEvent.value = null
  isModalOpen.value = true
}

function onMonthDayClick(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const d = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  newEventDefaults.value = { startAt: `${d}T09:00:00`, endAt: `${d}T10:00:00` }
  selectedEvent.value = null
  isModalOpen.value = true
}

function onModalSave(event: any) {
  if (selectedEvent.value?.id) updateEvent(event.id, event)
  else { const { id: _, ...rest } = event; addEvent(rest) }
}

function onModalDelete(event: any) { removeEvent(event.id) }

// ── Auto-animate refs ─────────────────────────────────────────────────────────
const [pendingListRef] = useAutoAnimate()
const [doneListRef] = useAutoAnimate()

// ── Color swatch ──────────────────────────────────────────────────────────────
function colorDot(color: CalendarColor) {
  return { backgroundColor: `var(--color-${color}-500)` }
}
</script>

<template>
  <ClientOnly>
    <div
      v-if="isReady"
      class="flex h-full overflow-hidden"
    >
      <!-- ── Left: Calendar ─────────────────────────────────────────────── -->
      <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
        <!-- Calendar header -->
        <div class="flex items-center gap-1.5 px-4 py-3 border-b border-default shrink-0">
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
            {{ viewTitle }}
          </h2>
          <!-- View toggle -->
          <div class="flex items-center gap-0.5">
            <UButton
              v-for="v in (['month', 'week', 'day'] as CalendarView[])"
              :key="v"
              :variant="currentView === v ? 'solid' : 'ghost'"
              :color="currentView === v ? 'primary' : 'neutral'"
              size="sm"
              class="capitalize"
              @click="currentView = v"
            >
              {{ v }}
            </UButton>
          </div>
        </div>

        <!-- Month view -->
        <ProtoCalendarMonth
          v-if="currentView === 'month'"
          :events="events"
          :current-date="currentDate"
          class="flex-1 overflow-hidden"
          @day-click="onMonthDayClick"
          @event-click="onEventClick"
          @event-move="(id, s, e) => moveEvent(id, s, e)"
          @external-drop="onExternalDrop"
        />

        <!-- Week view -->
        <ProtoCalendarWeek
          v-else-if="currentView === 'week'"
          :events="events"
          :current-date="currentDate"
          class="flex-1 overflow-hidden"
          @range-select="onRangeSelect"
          @event-click="onEventClick"
          @event-move="(id, s, e) => moveEvent(id, s, e)"
          @event-update="(id, patch) => updateEvent(id, patch)"
          @external-drop="onExternalDrop"
        />

        <!-- Day view -->
        <ProtoCalendarDay
          v-else
          :events="events"
          :current-date="currentDate"
          class="flex-1 overflow-hidden"
          @range-select="onRangeSelect"
          @event-click="onEventClick"
          @event-move="(id, s, e) => moveEvent(id, s, e)"
          @event-update="(id, patch) => updateEvent(id, patch)"
          @external-drop="onExternalDrop"
        />
      </div>

      <!-- ── Right: Task panel ──────────────────────────────────────────── -->
      <aside class="w-64 shrink-0 border-l border-default flex flex-col overflow-hidden bg-elevated">
        <!-- Header -->
        <div class="px-4 py-3 border-b border-default flex items-center gap-2">
          <UIcon
            name="i-lucide-list-checks"
            class="w-4 h-4 text-primary shrink-0"
          />
          <h3 class="text-sm font-semibold text-highlighted flex-1">
            Tasks
          </h3>
          <span class="text-xs text-muted tabular-nums">
            {{ pendingTasks.length }} left
          </span>
        </div>

        <!-- Hint -->
        <div class="px-3 py-2 border-b border-default bg-muted/30">
          <p class="text-xs text-muted leading-relaxed">
            <UIcon
              name="i-lucide-grip-vertical"
              class="inline w-3 h-3 align-middle"
            />
            Drag a task onto any calendar day or time slot.
          </p>
        </div>

        <!-- Task list -->
        <div class="flex-1 overflow-y-auto py-1">
          <!-- Pending -->
          <div ref="pendingListRef">
            <div
              v-for="task in pendingTasks"
              :key="task.id"
              class="group flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors rounded mx-1 my-0.5"
              :class="{
                'opacity-40 scale-95': draggingTask?.id === task.id,
                'cursor-default': scheduledTaskIds.has(task.id),
              }"
              :draggable="!scheduledTaskIds.has(task.id)"
              @dragstart="onTaskDragStart($event, task)"
              @dragend="onTaskDragEnd"
            >
              <!-- Grip (unscheduled) or calendar check (scheduled) -->
              <UIcon
                v-if="scheduledTaskIds.has(task.id)"
                name="i-lucide-calendar-check"
                class="w-4 h-4 text-primary shrink-0"
                title="Already on calendar"
              />
              <UIcon
                v-else
                name="i-lucide-grip-vertical"
                class="w-4 h-4 text-muted cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <button
                class="w-2.5 h-2.5 rounded-full shrink-0 transition-transform ring-1 ring-black/10 dark:ring-white/10"
                :class="scheduledTaskIds.has(task.id) ? '' : 'hover:scale-125'"
                :style="colorDot(task.color)"
                :title="`Color: ${task.color}`"
                :disabled="scheduledTaskIds.has(task.id)"
                @click.stop="!scheduledTaskIds.has(task.id) && cycleColor(task)"
              />
              <UCheckbox
                :model-value="task.done"
                class="shrink-0"
                @update:model-value="toggleTask(task)"
              />
              <span
                class="flex-1 text-sm truncate select-none leading-tight"
                :class="scheduledTaskIds.has(task.id) ? 'text-muted' : 'text-default'"
              >
                {{ task.title }}
              </span>
              <!-- Scheduled badge -->
              <span
                v-if="scheduledTaskIds.has(task.id)"
                class="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0"
              >
                scheduled
              </span>
              <UButton
                v-else
                icon="i-lucide-x"
                variant="ghost"
                color="neutral"
                size="xs"
                class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                @click.stop="deleteTask(task)"
              />
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-if="pendingTasks.length === 0 && doneTasks.length === 0"
            class="px-4 py-8 text-center"
          >
            <UIcon
              name="i-lucide-clipboard-list"
              class="w-8 h-8 mx-auto mb-2 text-muted opacity-40"
            />
            <p class="text-sm text-muted">
              No tasks yet.
            </p>
            <p class="text-xs text-muted mt-1 opacity-70">
              Add tasks below, then drag to the calendar.
            </p>
          </div>

          <!-- Done section -->
          <template v-if="doneTasks.length > 0">
            <div class="px-3 pt-3 pb-1">
              <p class="text-xs font-medium text-muted uppercase tracking-wider">
                Done · {{ doneTasks.length }}
              </p>
            </div>
            <div ref="doneListRef">
              <div
                v-for="task in doneTasks"
                :key="task.id"
                class="group flex items-center gap-2 px-3 py-1.5 mx-1 rounded opacity-50 hover:opacity-70 transition-opacity"
              >
                <div class="w-4 shrink-0" />
                <div
                  class="w-2.5 h-2.5 rounded-full shrink-0"
                  :style="colorDot(task.color)"
                />
                <UCheckbox
                  :model-value="task.done"
                  class="shrink-0"
                  @update:model-value="toggleTask(task)"
                />
                <span class="flex-1 text-sm text-muted line-through truncate select-none">
                  {{ task.title }}
                </span>
                <UButton
                  icon="i-lucide-x"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.stop="deleteTask(task)"
                />
              </div>
            </div>
          </template>
        </div>

        <!-- Add task -->
        <div class="border-t border-default p-3">
          <form
            class="flex gap-2"
            @submit.prevent="addTask"
          >
            <UInput
              v-model="newTaskTitle"
              placeholder="New task..."
              size="sm"
              class="flex-1"
              @keydown.enter.prevent="addTask"
            />
            <UButton
              type="submit"
              size="sm"
              icon="i-lucide-plus"
              :disabled="!newTaskTitle.trim()"
            />
          </form>
        </div>
      </aside>
    </div>

    <!-- Loading -->
    <div
      v-else
      class="flex h-full gap-2 p-2"
    >
      <div class="flex-1 animate-pulse bg-muted/30 rounded" />
      <div class="w-64 animate-pulse bg-muted/20 rounded" />
    </div>

    <template #fallback>
      <div class="flex h-full gap-2 p-2">
        <div class="flex-1 animate-pulse bg-muted rounded" />
        <div class="w-64 animate-pulse bg-muted/60 rounded" />
      </div>
    </template>
  </ClientOnly>

  <!-- Event modal -->
  <ProtoCalendarEventModal
    v-model:open="isModalOpen"
    :event="selectedEvent"
    :defaults="newEventDefaults"
    @save="onModalSave"
    @delete="onModalDelete"
  />
</template>
