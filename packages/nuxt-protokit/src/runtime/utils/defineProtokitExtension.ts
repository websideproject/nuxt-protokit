import { defineAsyncComponent, markRaw } from 'vue'
import type { Component } from 'vue'

const RESERVED_NAMESPACES = ['proto', 'protokit', 'nuxt', 'vue']

export interface ProtokitFieldExtension {
  component: Component | (() => Promise<{ default: Component }>)
}

export interface ProtokitVizExtension {
  component: Component | (() => Promise<{ default: Component }>)
}

export interface ProtokitExtensionInput {
  namespace: string
  fields?: Record<string, ProtokitFieldExtension>
  vizTypes?: Record<string, ProtokitVizExtension>
}

export interface ProtokitExtension {
  namespace: string
  fields: Map<string, Component> // key = 'namespace:name'
  vizTypes: Map<string, Component> // key = 'namespace:name'
}

export function defineProtokitExtension(def: ProtokitExtensionInput): ProtokitExtension {
  if (import.meta.dev && RESERVED_NAMESPACES.includes(def.namespace)) {
    throw new Error(`[protokit] Namespace "${def.namespace}" is reserved. Choose a unique package-based name.`)
  }

  const fields = new Map<string, Component>()
  for (const [name, ext] of Object.entries(def.fields ?? {})) {
    const fullType = `${def.namespace}:${name}`
    const comp = typeof ext.component === 'function' && !('setup' in ext.component) && !('render' in ext.component)
      ? defineAsyncComponent(ext.component as () => Promise<{ default: Component }>)
      : ext.component as Component
    fields.set(fullType, markRaw(comp))
  }

  const vizTypes = new Map<string, Component>()
  for (const [name, ext] of Object.entries(def.vizTypes ?? {})) {
    const fullType = `${def.namespace}:${name}`
    const comp = typeof ext.component === 'function' && !('setup' in ext.component) && !('render' in ext.component)
      ? defineAsyncComponent(ext.component as () => Promise<{ default: Component }>)
      : ext.component as Component
    vizTypes.set(fullType, markRaw(comp))
  }

  return { namespace: def.namespace, fields, vizTypes }
}
