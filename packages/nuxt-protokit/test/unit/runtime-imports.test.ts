/**
 * Every runtime file must import what it calls.
 *
 * Nuxt applies auto-imports to the app's own code, not to a module's compiled runtime in node_modules. A runtime
 * file that calls `computed()` or `useProtoKitConfig()` without importing it works in the playground (the module is
 * workspace source there) and throws `... is not defined` in an app that installed the package: the published 0.0.3
 * returned 500 on every page with a <ProtoTool> for exactly this reason.
 *
 * The check is lexical: calls to a Vue API, a Nuxt composable or one of the module's own composables/utils that the
 * file neither imports nor defines. `$fetch` counts: Nuxt 4 declares it as a global, Nuxt 5 no longer does.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const runtime = fileURLToPath(new URL('../../src/runtime', import.meta.url))

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const files = walk(runtime).filter(f => /\.(?:ts|vue)$/.test(f) && !f.endsWith('.d.ts'))

const moduleExports = new Set(
  ['composables', 'utils'].flatMap(dir => walk(join(runtime, dir))).flatMap((file) => {
    const src = readFileSync(file, 'utf8')
    return [...src.matchAll(/export (?:async )?(?:function|const|class) (\w+)/g)].map(m => m[1]!)
  }),
)

const VUE = ['ref', 'computed', 'watch', 'watchEffect', 'reactive', 'readonly', 'shallowRef', 'toRef', 'toRefs', 'toRaw',
  'unref', 'isRef', 'nextTick', 'onMounted', 'onUnmounted', 'onBeforeUnmount', 'onBeforeMount', 'provide', 'inject',
  'defineComponent', 'h', 'markRaw', 'triggerRef', 'customRef', 'useSlots', 'useAttrs', 'getCurrentInstance']
const NUXT = ['$fetch', 'useRuntimeConfig', 'useState', 'useNuxtApp', 'navigateTo', 'useRoute', 'useRouter', 'useToast',
  'useFetch', 'useAsyncData', 'useHead', 'useCookie', 'useColorMode', 'useOverlay']
const AUTO_IMPORTED = new Set([...VUE, ...NUXT, ...moduleExports])

function missingImports(file: string): string[] {
  const src = readFileSync(file, 'utf8')
  const script = file.endsWith('.vue') ? (src.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? '') : src
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  const available = new Set<string>()
  for (const m of script.matchAll(/^import (?!type )([^'"]+) from ['"]/gm)) {
    for (const spec of m[1]!.replace(/[{}]/g, ' ').split(',')) {
      const name = spec.replace(/^\s*type\s+/, '').trim().split(/\s+as\s+/).pop()
      if (name) available.add(name)
    }
  }
  for (const m of script.matchAll(/(?:function|const|let|var|class)\s+(\w+)/g)) available.add(m[1]!)

  const called = new Set([...code.matchAll(/(?<![\w.$])(\$?\w+)\s*\(/g)].map(m => m[1]!))
  return [...called].filter(name => AUTO_IMPORTED.has(name) && !available.has(name)).sort()
}

describe('runtime imports', () => {
  it('finds the runtime files and the module\'s own exports', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(moduleExports.has('useProtoKitConfig')).toBe(true)
  })

  it('every runtime file imports the auto-imported functions it calls', () => {
    const offenders = Object.fromEntries(
      files.map(f => [relative(runtime, f), missingImports(f)] as const).filter(([, missing]) => missing.length),
    )
    expect(offenders).toEqual({})
  })
})
