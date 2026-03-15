import type { ComputeContext, DerivedDef, ConnectionsDef } from './compute'
import type { DashboardLayout, CardDef, VizDef, ResultSectionDef, SectionDef } from './brick'
import type { CollectionPermissions, FieldPermissions } from './permissions'

// --- Field Definitions ---

export type SimpleFieldDef<T = any> = {
  type: 'number' | 'text' | 'textarea' | 'select' | 'range' | 'tags'
    | 'date' | 'toggle' | 'segmented' | 'rating' | 'color'
  label: string | ((value: T) => string)
  default: T
  placeholder?: string
  help?: string
  hint?: string
  leading?: string
  trailing?: string
  min?: number
  max?: number
  step?: number
  options?: Array<string | { label: string, value: any, icon?: string }>
  rangeLabels?: { min: string, max: string }
  showWhen?: (values: Record<string, any>) => boolean
  format?: 'money' | 'percent' | 'number' | 'date' | ((v: T) => string)
  deep?: boolean
  /**
   * Frontend visibility/editability guards for this field.
   *
   * ⚠️ **Frontend only** — the Y.js document value is always present.
   * See {@link FieldPermissions} for details.
   */
  permissions?: FieldPermissions
}

export type LinkedResponsesFieldDef = {
  type: 'linked-responses'
  label: string
  default: Array<{ sourceId: string, answer: string }>
  sourceCollection: string
  sourceLabel: (item: Record<string, any>) => string
  sourceBadge?: (item: Record<string, any>) => string
  answerPlaceholder?: string
  answerRows?: number
  /**
   * Frontend visibility/editability guards for this field.
   *
   * ⚠️ **Frontend only** — the Y.js document value is always present.
   * See {@link FieldPermissions} for details.
   */
  permissions?: FieldPermissions
}

export type CustomFieldDef<T = any> = {
  type: `${string}:${string}`
  label: string | ((value: T) => string)
  default: T
  props?: Record<string, any>
  showWhen?: (values: Record<string, any>) => boolean
  help?: string
  hint?: string
  /**
   * Frontend visibility/editability guards for this field.
   *
   * ⚠️ **Frontend only** — the Y.js document value is always present.
   * See {@link FieldPermissions} for details.
   */
  permissions?: FieldPermissions
}

export type FieldDef<T = any> = SimpleFieldDef<T> | LinkedResponsesFieldDef | CustomFieldDef<T>

// --- Schema Migration ---

/**
 * Each key is the TARGET version number. The runner steps through versions
 * in order, so v2→v5 applies migrations[3], [4], [5] in sequence.
 * Steps with no entry are skipped (treated as defaults-only changes).
 */
export type SchemaMigrations = Record<number, (data: Record<string, any>) => Record<string, any>>

// --- Preset Pack ---

export interface PresetPack {
  id: string
  label: string
  icon?: string
  description?: string
  color?: string
  items: Record<string, any>[]
}

// --- Collection Item Actions ---

export type CollectionItemAction =
  | {
      type: 'open-url'
      id: string
      icon: string
      label?: string
      title?: string
      color?: string
      variant?: string
      showWhen?: (item: Record<string, any>) => boolean
      disabledWhen?: (item: Record<string, any>) => boolean
      url: (item: Record<string, any>, collections: Record<string, any[]>) => string | null
    }
  | {
      type: 'status-set'
      id: string
      icon: string
      label?: string
      title?: string
      color?: string
      toStatus: string
      showWhen?: (item: Record<string, any>) => boolean
    }
  | {
      type: 'custom'
      id: string
      icon: string
      label?: string
      title?: string
      color?: string
      variant?: string
      showWhen?: (item: Record<string, any>) => boolean
      disabledWhen?: (item: Record<string, any>) => boolean
    }

// --- Status Field ---

export interface StatusFieldDef {
  key: string
  states: Record<string, {
    label: string
    color: 'neutral' | 'info' | 'success' | 'warning' | 'error'
    icon?: string
  }>
}

// --- Collection Schema (CRUD) ---

export interface CollectionSchema {
  key: string
  title: string
  icon?: string
  itemLabel: (item: Record<string, any>) => string
  fields: Record<string, FieldDef>
  defaults: Record<string, any>
  maxItems?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  searchable?: boolean
  searchFields?: string[]
  editMode?: 'inline' | 'modal'
  /** Width override for modal edit mode. Uses Tailwind max-w class. Defaults to 'sm'. */
  modalSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
  presets?: PresetPack[]
  onboardingPresets?: boolean
  listDisplay?: {
    primaryField: string
    secondaryField?: string
    badgeField?: string
    avatarField?: string
  }
  tableColumns?: Array<{
    key: string
    label: string
    sortable?: boolean
    format?: 'money' | 'percent' | 'number' | 'date' | ((v: any) => string)
  }>
  validate?: (item: Record<string, any>) => true | false | string | Record<string, string>
  /** Current schema version. Increment when you need to transform stored data. */
  version?: number
  /** Step functions keyed by target version. See SchemaMigrations. */
  migrations?: SchemaMigrations
  /**
   * Frontend CRUD guards for this collection.
   *
   * The UI hides or disables controls based on these guards.
   * For true access control, also enforce these rules on the server.
   */
  permissions?: CollectionPermissions
  /** Show a colored status badge per item based on a field value. */
  statusField?: StatusFieldDef
  /** Per-item action buttons rendered in the item row. */
  itemActions?: CollectionItemAction[]
  /** Per-item expandable panels toggled from the item row. */
  itemPanels?: CollectionItemPanel[]
}

// --- Action Definitions ---

export type ProtoAction
  = | {
    type: 'copy-text'
    id: string
    label: string
    icon?: string
    showWhen?: (ctx: ComputeContext) => boolean
    text: (ctx: ComputeContext, collectionArrays: Record<string, any[]>) => string
  }
  | {
    type: 'export-markdown'
    id: string
    label: string
    icon?: string
    showWhen?: (ctx: ComputeContext) => boolean
    content: (ctx: ComputeContext, collectionArrays: Record<string, any[]>) => string
    filename?: string
  }
  | {
    type: 'reset'
    id: string
    label: string
    icon?: string
    showWhen?: (ctx: ComputeContext) => boolean
  }

// --- Collection Item Panels ---

export interface TimeSeriesPanelDef {
  type: 'time-series'
  id: string
  label: string
  icon?: string
  historyKey: string
  metrics: Array<{
    key: string
    label: string
    showWhen?: (item: Record<string, any>) => boolean
  }>
  showWhen?: (item: Record<string, any>) => boolean
}

export interface TextTemplatePanelDef {
  type: 'text-template'
  id: string
  label: string
  icon?: string
  sections: Array<{
    id: string
    label: string
    template: (item: Record<string, any>, ctx: { collections: Record<string, any[]> }) => string
    charLimit?: number
    hint?: string
    tip?: string
  }>
  tip?: string | ((item: Record<string, any>, ctx: { collections: Record<string, any[]> }) => string | undefined)
  showWhen?: (item: Record<string, any>) => boolean
}

export interface UrlInputPanelDef {
  type: 'url-input'
  id: string
  label: string
  icon?: string
  field: string
  placeholder?: string
  onConfirm?: (url: string, item: Record<string, any>) => Partial<Record<string, any>>
  showWhen?: (item: Record<string, any>) => boolean
}

export type CollectionItemPanel = TimeSeriesPanelDef | TextTemplatePanelDef | UrlInputPanelDef

// --- Prototype Schema (Complete Tool) ---

export interface PrototypeSchema {
  key: string
  title: string
  shortTitle: string
  description: string
  icon: string
  tags?: string[]

  // Input fields → Y.Map keys
  fields: Record<string, FieldDef>
  sections?: SectionDef[]
  defaultCols?: 1 | 2 | 3 | 4

  // CRUD collections (Y.Arrays)
  collections?: Record<string, CollectionSchema>

  // Computed values (not stored in Y.js)
  derived?: Record<string, DerivedDef>

  // Display
  results?: ResultSectionDef[]
  visualizations?: VizDef[]
  cards?: CardDef[]

  // Cross-tool connections
  connections?: ConnectionsDef

  // Schema-level produces/consumes (recommended API over low-level ConnectionsDef)
  produces?: Record<string, 'number' | 'string' | 'boolean' | 'string[]' | 'object' | 'object[]'>
  consumes?: Record<string, string>

  // Declarative actions
  actions?: ProtoAction[]

  // Dashboard layout
  layout?: DashboardLayout

  /** Current schema version. Increment when you need to transform stored field data. */
  version?: number
  /** Step functions keyed by target version. See SchemaMigrations. */
  migrations?: SchemaMigrations
}
