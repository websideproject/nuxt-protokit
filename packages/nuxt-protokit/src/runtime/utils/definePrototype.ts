import type { PrototypeSchema } from '../types/schema'

/**
 * Type-safe helper to define a prototype tool schema.
 * Returns the schema unchanged — purely for type inference and autocomplete.
 */
export function definePrototype(schema: PrototypeSchema): PrototypeSchema {
  return schema
}
