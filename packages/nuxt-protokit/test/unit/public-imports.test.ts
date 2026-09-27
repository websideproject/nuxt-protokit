/**
 * The module auto-imports only its public API (PUBLIC_IMPORTS in src/module.ts). A composable missing from the list
 * would silently stop being available in apps; an internal helper added to it would become a global with a generic
 * name in every app.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { PUBLIC_IMPORTS } from '../../src/module'

const runtime = fileURLToPath(new URL('../../src/runtime', import.meta.url))

const exportsOf = (file: string) =>
  [...readFileSync(join(runtime, `${file}.ts`), 'utf8').matchAll(/export (?:async )?(?:function|const|class) (\w+)/g)].map(m => m[1]!)

describe('auto-imports', () => {
  it('every entry names an export of its file', () => {
    const missing = PUBLIC_IMPORTS.filter(([name, file]) => !exportsOf(file).includes(name))
    expect(missing).toEqual([])
  })

  it('every use* composable is auto-imported', () => {
    const listed = new Set(PUBLIC_IMPORTS.map(([name]) => name))
    const composables = readdirSync(join(runtime, 'composables'))
      .filter(f => f.endsWith('.ts'))
      .flatMap(f => exportsOf(`composables/${f.replace(/\.ts$/, '')}`))
      .filter(name => name.startsWith('use'))
    expect(composables.filter(name => !listed.has(name))).toEqual([])
  })

  it('only use*, define* and protokit-named functions become globals', () => {
    const generic = PUBLIC_IMPORTS.map(([name]) => name).filter(name => !/^(?:use|define)|Proto/.test(name))
    expect(generic).toEqual([])
  })
})
