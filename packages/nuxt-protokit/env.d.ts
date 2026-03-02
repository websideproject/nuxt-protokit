import type { Ref, ComputedRef, WatchCallback } from 'vue'

declare global {
  const ref: typeof import('vue')['ref']
  const computed: typeof import('vue')['computed']
  const watch: typeof import('vue')['watch']
  const nextTick: typeof import('vue')['nextTick']
  const reactive: typeof import('vue')['reactive']
  const unref: typeof import('vue')['unref']
  const onMounted: typeof import('vue')['onMounted']
  const onUnmounted: typeof import('vue')['onUnmounted']
  const useProtoCorruption: typeof import('./src/runtime/composables/useProtoCorruption')['useProtoCorruption']
  const useProtoDebugInfo: typeof import('./src/runtime/composables/useProtoDebugInfo')['useProtoDebugInfo']
  const useProtoKitConfig: typeof import('./src/runtime/composables/useProtoKitConfig')['useProtoKitConfig']
  const useRuntimeConfig: typeof import('nuxt/app')['useRuntimeConfig']
}
export {}
