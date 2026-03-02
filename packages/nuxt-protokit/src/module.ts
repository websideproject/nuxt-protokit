import { defineNuxtModule, addImportsDir, addComponentsDir, createResolver } from '@nuxt/kit'

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
    addImportsDir(resolver.resolve('./runtime/composables'))
    addImportsDir(resolver.resolve('./runtime/utils'))

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
