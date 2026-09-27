/**
 * Values must survive a reload.
 *
 * A reload is a new Y.Doc with a new random client ID. useProtoMap used to write the schema defaults into the
 * Y.Map before IndexedDB had delivered the stored values; Y.js resolves concurrent map writes by client ID, so
 * whenever the new client ID was the higher one the default replaced the stored value (~half of all reloads).
 * Each test repeats the reload so both client ID orderings are exercised.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { nextTick } from 'vue'
import { withSetup } from '../helpers/with-setup'
import { waitFor } from '../helpers/wait'
import { trackTestDb } from '../helpers/browser-setup'
import type { PrototypeSchema } from '../../src/runtime/types/schema'

beforeAll(() => {
  vi.stubGlobal('useRuntimeConfig', () => ({ public: {} }))
})

const { usePrototype } = await import('../../src/runtime/composables/usePrototype')

const ROUNDS = 12

const baseSchema: PrototypeSchema = {
  key: 'reload-tool',
  title: 'Reload',
  shortTitle: 'Reload',
  description: '',
  icon: 'i-lucide-box',
  fields: {
    value: { type: 'number', label: 'Value', default: 0 },
  },
}

let counter = 0
function uniqueNs(): string {
  const ns = `reload-${Date.now()}-${++counter}`
  trackTestDb(`proto:${ns}:${baseSchema.key}`)
  return ns
}

/** Mount usePrototype like a page load and wait until IndexedDB has delivered the stored state. */
async function open(schema: PrototypeSchema, namespace: string) {
  const session = withSetup(() => usePrototype(schema, { namespace }))
  await waitFor(() => session.result.isReady.value, 3000)
  return session
}

/** Unmount (which destroys the doc and its IndexedDB provider) and let the last write land. */
async function close(session: { cleanup: () => void }) {
  await new Promise(r => setTimeout(r, 50))
  session.cleanup()
  await new Promise(r => setTimeout(r, 50))
}

describe('usePrototype — reload', () => {
  it('a value set in one session is there after a reload', async () => {
    const lost: number[] = []
    for (let round = 0; round < ROUNDS; round++) {
      const ns = uniqueNs()

      const first = await open(baseSchema, ns)
      first.result.state.value.value = 9999
      await nextTick()
      await close(first)

      const second = await open(baseSchema, ns)
      if (second.result.state.value.value !== 9999) lost.push(round)
      await close(second)
    }
    expect(lost).toEqual([])
  })

  it('a field never set reads its default and stays unset in the doc', async () => {
    const ns = uniqueNs()
    const session = await open(baseSchema, ns)
    expect(session.result.state.value.value).toBe(0)
    expect(session.result.doc.getMap(baseSchema.key).has('value')).toBe(false)
    await close(session)
  })

  it('migrations run on the stored data, after it has loaded, and can read a field the schema dropped', async () => {
    const v1: PrototypeSchema = {
      ...baseSchema,
      version: 1,
      fields: { hours: { type: 'number', label: 'Hours', default: 0 } },
    }
    const v2: PrototypeSchema = {
      ...baseSchema,
      version: 2,
      fields: { minutes: { type: 'number', label: 'Minutes', default: 0 } },
      migrations: { 2: data => ({ minutes: (data.hours ?? 0) * 60 }) },
    }

    const lost: number[] = []
    for (let round = 0; round < ROUNDS; round++) {
      const ns = uniqueNs()

      const first = await open(v1, ns)
      first.result.state.hours.value = 2
      await nextTick()
      await close(first)

      const second = await open(v2, ns)
      await waitFor(() => second.result.doc.getMap(baseSchema.key).get('__proto_version__') === 2, 3000)
      await nextTick()
      if (second.result.state.minutes.value !== 120) lost.push(round)
      await close(second)
    }
    expect(lost).toEqual([])
  })
})
