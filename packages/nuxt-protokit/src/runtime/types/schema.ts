import type { ComputeContext, DerivedDef, ConnectionsDef } from './compute'
import type { DashboardLayout, CardDef, VizDef, ResultSectionDef, SectionDef } from './brick'

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
  options?: Array<string | { label: string; value: any; icon?: string }>
  rangeLabels?: { min: string; max: string }
  showWhen?: (values: Record<string, any>) => boolean
  format?: 'money' | 'percent' | 'number' | 'date' | ((v: T) => string)
  deep?: boolean
}

export type LinkedResponsesFieldDef = {
  type: 'linked-responses'
  label: string
  default: Array<{ sourceId: string; answer: string }>
  sourceCollection: string
  sourceLabel: (item: Record<string, any>) => string
  sourceBadge?: (item: Record<string, any>) => string
  answerPlaceholder?: string
  answerRows?: number
}

export type CustomFieldDef<T = any> = {
  type: `${string}:${string}`
  label: string | ((value: T) => string)
  default: T
  props?: Record<string, any>
  showWhen?: (values: Record<string, any>) => boolean
  help?: string
  hint?: string
}

export type FieldDef<T = any> = SimpleFieldDef<T> | LinkedResponsesFieldDef | CustomFieldDef<T>

// --- Preset Pack ---

export interface PresetPack {
  id: string
  label: string
  icon?: string
  description?: string
  color?: string
  items: Record<string, any>[]
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
}

// --- Action Definitions ---

export type ProtoAction =
  | {
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
}
