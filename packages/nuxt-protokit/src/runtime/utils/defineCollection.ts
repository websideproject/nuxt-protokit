import type { CollectionSchema } from '../types/schema'

/**
 * Type-safe helper to define a CRUD collection schema.
 * Returns the schema unchanged — purely for type inference and autocomplete.
 */
export function defineCollection(schema: CollectionSchema): CollectionSchema {
  return schema
}
