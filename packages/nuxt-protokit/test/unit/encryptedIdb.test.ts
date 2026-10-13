import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { EncryptedIdbPersistence, EncryptionKeyError } from '../../src/runtime/composables/useEncryptedIdb'

const tick = () => new Promise(resolve => setTimeout(resolve, 10))

/** A doc as useProtoMap leaves it: defaults already written before the store loads. */
function docWithDefaults() {
  const doc = new Y.Doc()
  doc.getMap('defaults').set('theme', 'light')
  return doc
}

async function open(name: string, password: string) {
  const doc = docWithDefaults()
  const store = new EncryptedIdbPersistence(name, doc, { password })
  const error = await store.whenSynced.then(() => null, (e: unknown) => e)
  return { doc, store, error }
}

describe('EncryptedIdbPersistence', () => {
  it('reopens with the right password', async () => {
    const first = await open('enc-roundtrip', 'right')
    first.doc.getMap('m').set('a', 1)
    await tick()
    await first.store.destroy()

    const again = await open('enc-roundtrip', 'right')
    expect(again.error).toBeNull()
    expect(again.doc.getMap('m').get('a')).toBe(1)
  })

  it('a wrong password fails without touching the store — even past the compaction threshold', async () => {
    const first = await open('enc-wrong-password', 'right')
    for (let i = 0; i < 60; i++) {
      first.doc.getMap('m').set(`k${i}`, i)
      await tick()
    }
    await first.store.destroy()

    const wrong = await open('enc-wrong-password', 'WRONG')
    expect(wrong.error).toBeInstanceOf(EncryptionKeyError)
    expect(wrong.doc.getMap('m').size).toBe(0)
    // Typing into the unopened doc must not be written (under the wrong key) either.
    wrong.doc.getMap('m').set('stray', true)
    await tick()
    await wrong.store.destroy()

    const right = await open('enc-wrong-password', 'right')
    expect(right.error).toBeNull()
    expect(right.doc.getMap('m').size).toBe(60)
    expect(right.doc.getMap('m').has('stray')).toBe(false)
  })
})
