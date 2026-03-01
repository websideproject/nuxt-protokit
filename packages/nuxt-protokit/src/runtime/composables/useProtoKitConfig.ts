export interface ProtoKitSyncConfig {
  enabled: boolean
  baseUrl: string
}

export interface ProtoKitConfig {
  serverSync: ProtoKitSyncConfig
}

/**
 * Read the protokit module runtime config.
 *
 * Config is set in nuxt.config.ts under the `protokit` key:
 * ```ts
 * protokit: {
 *   serverSync: false,                      // local-only, no HTTP calls
 *   serverSync: { baseUrl: '/api/my-yjs' }, // custom server
 * }
 * ```
 */
export function useProtoKitConfig(): ProtoKitConfig {
  const runtimeConfig = useRuntimeConfig()
  const raw = (runtimeConfig.public as any)?.protokit?.serverSync

  if (!raw || raw.enabled === false) {
    return { serverSync: { enabled: false, baseUrl: '/api/yjs' } }
  }

  return {
    serverSync: {
      enabled: raw.enabled ?? true,
      baseUrl: raw.baseUrl ?? '/api/yjs',
    },
  }
}
