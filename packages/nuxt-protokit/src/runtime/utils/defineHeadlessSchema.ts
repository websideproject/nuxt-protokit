import type { PrototypeSchema, FieldDef, CollectionSchema, SchemaMigrations } from '../types/schema'
import type { DerivedDef } from '../types/compute'

/**
 * Minimal schema for headless use — only storage-relevant fields required.
 * Visual-only fields (title, shortTitle, description, icon, results,
 * visualizations, cards, layout, actions) are omitted or optional because
 * they are only consumed by ProtoTool / ProtoForm rendering.
 */
export type HeadlessSchema = {
  /** Unique key — used as the Y.js document name and IndexedDB store key. */
  key: string
  /** Field definitions for Y.Map ↔ reactive refs sync. */
  fields: Record<string, FieldDef>
  /** Optional CRUD collections (Y.Arrays). */
  collections?: Record<string, CollectionSchema>
  /** Optional derived (computed) values. */
  derived?: Record<string, DerivedDef>
  /** Current schema version. Increment to trigger migrations. */
  version?: number
  /** Step functions keyed by target version. See SchemaMigrations. */
  migrations?: SchemaMigrations
}

/**
 * Define a headless protokit schema — only `key` and `fields` are required.
 *
 * Fills in empty/derived values for the visual-only `PrototypeSchema` fields
 * (`title`, `shortTitle`, `description`, `icon`) so the result is directly
 * usable with `usePrototype` without needing to supply UI-only metadata.
 *
 * Use this when you want the Y.js storage layer — IndexedDB persistence,
 * BroadcastChannel tab sync, optional server sync, and schema migrations —
 * but you are building your own UI instead of using `ProtoTool` / `ProtoForm`.
 *
 * @example
 * // User settings persisted to IndexedDB, synced across tabs
 * const settingsSchema = defineHeadlessSchema({
 *   key: 'user-settings',
 *   fields: {
 *     theme:    { type: 'select', label: 'Theme',    default: 'system',
 *                 options: ['system', 'light', 'dark'] },
 *     language: { type: 'select', label: 'Language', default: 'en',
 *                 options: ['en', 'de', 'fr'] },
 *     sidebar:  { type: 'toggle', label: 'Sidebar',  default: true },
 *   },
 * })
 *
 * // In any component or composable:
 * const { state, isReady } = usePrototype(settingsSchema, { disableSync: true })
 * // state.theme.value, state.language.value, state.sidebar.value — reactive, persisted
 */
export function defineHeadlessSchema(schema: HeadlessSchema): PrototypeSchema {
  return {
    title: schema.key,
    shortTitle: schema.key,
    description: '',
    icon: '',
    ...schema,
  } as PrototypeSchema
}
