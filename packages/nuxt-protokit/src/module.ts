import { defineNuxtModule, addImports, addImportsDir, addComponentsDir, createResolver } from '@nuxt/kit'

declare module '@nuxt/schema' {
  interface NuxtHooks {
    'protokit:register-extension': (ctx: {
      addComponentsDir: (dir: string) => void
      addImportsDir: (dir: string) => void
    }) => void | Promise<void>
  }
}

export interface ModuleOptions {
  /**
   * Server-side sync via yjs-sync (or a compatible implementation).
   * - true / omitted  → sync enabled, baseUrl defaults to '/api/yjs'
   * - false           → local-only mode, no HTTP calls made at all
   * - object          → fine-grained control
   */
  serverSync?: boolean | {
    enabled?: boolean
    /** Base URL for all server sync requests. Default: '/api/yjs'. */
    baseUrl?: string
  }
}

/** Everything the module auto-imports into an app: `[export name, file under runtime/]`. */
export const PUBLIC_IMPORTS: Array<[name: string, file: string]> = [
  ['usePrototype', 'composables/usePrototype'],
  ['useProtoDoc', 'composables/useProtoDoc'],
  ['clearProtoNamespace', 'composables/useProtoDoc'],
  ['clearProtoKeys', 'composables/useProtoDoc'],
  ['useProtoMap', 'composables/useProtoMap'],
  ['useProtoList', 'composables/useProtoList'],
  ['useProtoText', 'composables/useProtoText'],
  ['useProtoCollection', 'composables/useProtoCollection'],
  ['useProtoCalendar', 'composables/useProtoCalendar'],
  ['useProtoDerived', 'composables/useProtoDerived'],
  ['useProtoOutputs', 'composables/useProtoOutputs'],
  ['useProtoConnections', 'composables/useProtoConnections'],
  ['useProtoDraft', 'composables/useProtoDraft'],
  ['useProtoPermissions', 'composables/useProtoPermissions'],
  ['configureProtoPermissions', 'composables/useProtoPermissions'],
  ['useProtoCorruption', 'composables/useProtoCorruption'],
  ['useProtoDebugInfo', 'composables/useProtoDebugInfo'],
  ['useProtoRegistry', 'composables/useProtoRegistry'],
  ['useProtoExtensionRegistry', 'composables/useProtoExtensionRegistry'],
  ['useProtoKitConfig', 'composables/useProtoKitConfig'],
  ['definePrototype', 'utils/definePrototype'],
  ['defineCollection', 'utils/defineCollection'],
  ['defineHeadlessSchema', 'utils/defineHeadlessSchema'],
  ['defineProtokitExtension', 'utils/defineProtokitExtension'],
]

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@websideproject/nuxt-protokit',
    configKey: 'protokit',
    compatibility: {
      nuxt: '>=4.0.0',
    },
  },

  defaults: {
    serverSync: true,
  },

  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // ── Resolve serverSync config ─────────────────────────────────────────────
    const raw = options.serverSync
    let syncEnabled: boolean
    let syncBaseUrl: string

    if (raw === false) {
      syncEnabled = false
      syncBaseUrl = '/api/yjs'
    }
    else if (raw === true || raw === undefined) {
      syncEnabled = true
      syncBaseUrl = '/api/yjs'
    }
    else {
      syncEnabled = raw.enabled ?? true
      syncBaseUrl = raw.baseUrl ?? '/api/yjs'
    }

    // Inject into runtimeConfig so composables can read it at runtime
    nuxt.options.runtimeConfig.public.protokit = {
      serverSync: {
        enabled: syncEnabled,
        baseUrl: syncBaseUrl,
      },
    }

    // ── Aliases ───────────────────────────────────────────────────────────────
    nuxt.options.alias['#protokit'] = resolver.resolve('./runtime')
    nuxt.options.alias['#protokit/*'] = resolver.resolve('./runtime/*')

    // ── Extension hook (module-to-module interop) ─────────────────────────────
    await nuxt.callHook('protokit:register-extension' as any, {
      addComponentsDir: (dir: string) => addComponentsDir({ path: dir, global: true }),
      addImportsDir: (dir: string) => addImportsDir(dir),
    })

    // ── Auto-imports ──────────────────────────────────────────────────────────
    // Only the public API becomes a global in the app: the composables and the define* helpers. Internal helpers
    // with generic names (formatDate, addDays, isToday, deepClone, documentCache, …) would otherwise collide with the
    // app's own; they stay importable from '#protokit/utils/<file>' and '#protokit/composables/<file>'.
    addImports(PUBLIC_IMPORTS.map(([name, file]) => ({ name, from: resolver.resolve(`./runtime/${file}`) })))

    // Auto-import ALL components (fields + bricks)
    // global: true so <component :is="'ProtoXxx'"> works at runtime
    addComponentsDir({
      path: resolver.resolve('./runtime/components'),
      pathPrefix: false,
      global: true,
    })

    // Register module types
    nuxt.hook('prepare:types', ({ references }) => {
      references.push({
        path: resolver.resolve('./runtime/types/index.ts'),
      })
    })
  },
})
