import type { Component } from 'vue'
import type { ProtokitExtension } from '../utils/defineProtokitExtension'

// Module-level maps shared across all composable calls
const fieldRegistry = new Map<string, Component>()
const vizRegistry = new Map<string, Component>()

export function useProtoExtensionRegistry() {
  const registerExtension = (ext: ProtokitExtension) => {
    for (const [type, comp] of ext.fields) {
      if (import.meta.dev && fieldRegistry.has(type)) {
        console.warn(`[protokit] Field type "${type}" already registered, overwriting.`)
      }
      fieldRegistry.set(type, comp)
    }
    for (const [type, comp] of ext.vizTypes) {
      if (import.meta.dev && vizRegistry.has(type)) {
        console.warn(`[protokit] Viz type "${type}" already registered, overwriting.`)
      }
      vizRegistry.set(type, comp)
    }
  }

  const getFieldComponent = (type: string): Component | undefined =>
    type.includes(':') ? fieldRegistry.get(type) : undefined

  const getVizComponent = (type: string): Component | undefined =>
    type.includes(':') ? vizRegistry.get(type) : undefined

  return { registerExtension, getFieldComponent, getVizComponent }
}
