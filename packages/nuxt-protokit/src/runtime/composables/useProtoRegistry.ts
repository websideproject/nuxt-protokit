import { ref, type Ref } from 'vue'
import type { PrototypeSchema } from '../types/schema'
import type { CollectionSchema } from '../types/schema'

const prototypeRegistry = new Map<string, PrototypeSchema>()
const collectionRegistry = new Map<string, CollectionSchema>()

/**
 * Register and discover prototype schemas.
 */
export function useProtoRegistry() {
  const schemas = ref<PrototypeSchema[]>([]) as Ref<PrototypeSchema[]>

  const refreshList = () => {
    schemas.value = Array.from(prototypeRegistry.values())
  }

  const registerPrototype = (schema: PrototypeSchema) => {
    prototypeRegistry.set(schema.key, schema)
    refreshList()
  }

  const registerCollection = (schema: CollectionSchema) => {
    collectionRegistry.set(schema.key, schema)
  }

  const getPrototype = (key: string): PrototypeSchema | undefined => {
    return prototypeRegistry.get(key)
  }

  const getCollection = (key: string): CollectionSchema | undefined => {
    return collectionRegistry.get(key)
  }

  const listPrototypes = (): PrototypeSchema[] => {
    return Array.from(prototypeRegistry.values())
  }

  const listCollections = (): CollectionSchema[] => {
    return Array.from(collectionRegistry.values())
  }

  refreshList()

  return {
    schemas,
    registerPrototype,
    registerCollection,
    getPrototype,
    getCollection,
    listPrototypes,
    listCollections,
  }
}
