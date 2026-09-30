import { ref, readonly } from 'vue'

export interface CorruptionEvent {
  id: string
  /** Y.js doc full key, e.g. 'proto:saaskit-idea-abc123' */
  fullKey: string
  /** Human-readable name shown in the modal */
  displayName: string
  /** Server snapshot ID to restore from, null if no server backup exists */
  latestSnapshotId: string | null
  /** Milliseconds since the server snapshot was created, null if none */
  latestSnapshotAge: number | null
  /** Optional snapshot label from the server */
  latestSnapshotLabel: string | null
  /** Whether server sync is on for this doc — decides what the modal promises about future backups */
  syncEnabled: boolean
  /** Raw error message for debugging */
  reason: string
  /** Internal: resolved by resolveCorruption() */
  _resolve: (action: 'restore' | 'fresh') => void
}

// Module-level singleton — shared across all components without Vue context
const _queue = ref<CorruptionEvent[]>([])

/**
 * Report a Y.js doc corruption event and wait for the user to decide how to recover.
 * Returns a Promise that resolves to 'restore' or 'fresh' based on the user's choice.
 * Can be called outside of Vue component setup (e.g. from useProtoDoc event handlers).
 */
function reportCorruption(data: Omit<CorruptionEvent, 'id' | '_resolve'>): Promise<'restore' | 'fresh'> {
  return new Promise((resolve) => {
    _queue.value.push({
      id: Math.random().toString(36).slice(2),
      ...data,
      _resolve: resolve,
    })
  })
}

/**
 * Resolve a corruption event by ID with the user's chosen action.
 * Called by the ProtoCorruptionModal component after the user clicks a button.
 */
function resolveCorruption(id: string, action: 'restore' | 'fresh') {
  const idx = _queue.value.findIndex(e => e.id === id)
  if (idx !== -1) {
    const event = _queue.value[idx]
    _queue.value.splice(idx, 1)
    event._resolve(action)
  }
}

export function useProtoCorruption() {
  return {
    /** Reactive read-only queue — the modal shows when this is non-empty */
    corruptionQueue: readonly(_queue),
    reportCorruption,
    resolveCorruption,
  }
}
