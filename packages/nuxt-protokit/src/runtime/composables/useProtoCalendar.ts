import { ref, type Ref } from 'vue'
import type * as Y from 'yjs'
import type { CalendarEvent } from '../types/calendar'
import { CALENDAR_EVENT_DEFAULTS } from '../types/calendar'
import { useProtoDoc, type EncryptionConfig } from './useProtoDoc'
import { useProtoList } from './useProtoList'

export interface UseProtoCalendarReturn {
  events: Ref<CalendarEvent[]>
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void
  removeEvent: (id: string) => void
  moveEvent: (id: string, newStartAt: string, newEndAt: string) => void
  isReady: Ref<boolean>
  doc: Y.Doc
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for non-HTTPS
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useProtoCalendar(options?: {
  docKey?: string
  namespace?: string
  encryption?: EncryptionConfig
  existingDoc?: Y.Doc
  disableSync?: boolean
}): UseProtoCalendarReturn {
  let doc: Y.Doc
  let isReady: Ref<boolean>

  if (options?.existingDoc) {
    doc = options.existingDoc
    isReady = ref(true) as Ref<boolean>
  }
  else {
    const baseKey = options?.docKey ?? 'proto-calendar'
    const resolvedKey = options?.namespace ? `${options.namespace}:${baseKey}` : baseKey
    const protoDoc = useProtoDoc(resolvedKey, {
      encryption: options?.encryption,
      disableSync: options?.disableSync,
    })
    doc = protoDoc.doc
    isReady = protoDoc.isReady
  }

  const list = useProtoList<CalendarEvent>(doc, 'calendar:events', {
    defaults: CALENDAR_EVENT_DEFAULTS,
    waitFor: isReady,
  })

  function addEvent(event: Omit<CalendarEvent, 'id'>) {
    const id = generateId()
    list.add({ ...CALENDAR_EVENT_DEFAULTS, ...event, id })
  }

  function updateEvent(id: string, patch: Partial<CalendarEvent>) {
    const index = list.items.value.findIndex(e => e.id === id)
    if (index === -1) return
    list.update(index, patch)
  }

  function removeEvent(id: string) {
    const index = list.items.value.findIndex(e => e.id === id)
    if (index === -1) return
    list.remove(index)
  }

  function moveEvent(id: string, newStartAt: string, newEndAt: string) {
    updateEvent(id, { startAt: newStartAt, endAt: newEndAt })
  }

  return {
    events: list.items,
    addEvent,
    updateEvent,
    removeEvent,
    moveEvent,
    isReady,
    doc,
  }
}
