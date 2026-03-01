// --- Section Definition ---

export interface SectionDef {
  title: string
  icon?: string
  description?: string
  fields: string[] // keys into PrototypeSchema.fields
  cols?: 1 | 2 | 3 | 4
  collapsible?: boolean
  defaultOpen?: boolean
}

// --- Result Section ---

export interface ResultSectionDef {
  title: string
  icon?: string
  showWhen?: (ctx: import('./compute').ComputeContext) => boolean
  badge?: (ctx: import('./compute').ComputeContext) => { label: string; color: string } | null
  stats: (ctx: import('./compute').ComputeContext) => Array<{
    label: string
    value: string | number
    subLabel?: string
    valueClass?: string
    bgClass?: string
  }>
  statCols?: 2 | 3 | 4
}

// --- Card Definition ---

export interface CardDef {
  title: string
  icon?: string
  description?: string
  stats?: (ctx: import('./compute').ComputeContext) => Array<{
    label: string
    value: string | number
    valueClass?: string
  }>
  badge?: (ctx: import('./compute').ComputeContext) => { label: string; color: string } | null
  footer?: string
}

// --- Visualization Definitions ---

export type VizType = 'progress' | 'benchmark' | 'bar-chart' | 'comparison-table' | 'feature-matrix' | 'timeline'

export interface VizDef {
  type: VizType
  title?: string
  showWhen?: (ctx: import('./compute').ComputeContext) => boolean
  config: VizProgressConfig | VizBenchmarkConfig | VizBarChartConfig | VizComparisonTableConfig | VizFeatureMatrixConfig | VizTimelineConfig
}

export interface VizProgressConfig {
  type: 'progress'
  value: (ctx: import('./compute').ComputeContext) => number
  max?: number
  label?: (ctx: import('./compute').ComputeContext) => string
  thresholds?: Array<{ value: number; color: string; label?: string }>
}

export interface VizBenchmarkConfig {
  type: 'benchmark'
  value: (ctx: import('./compute').ComputeContext) => number
  median: number
  min?: number
  max?: number
  label?: string
  unit?: string
}

export interface VizBarChartConfig {
  type: 'bar-chart'
  data: (ctx: import('./compute').ComputeContext) => Array<{ label: string; value: number; color?: string }>
  maxValue?: number
  unit?: string
}

export interface VizComparisonTableConfig {
  type: 'comparison-table'
  columns: Array<{ key: string; label: string }>
  rows: (ctx: import('./compute').ComputeContext) => Array<Record<string, any>>
}

export interface VizFeatureMatrixConfig {
  type: 'feature-matrix'
  features: string[]
  entities: (ctx: import('./compute').ComputeContext) => Array<{
    name: string
    coverage: Record<string, boolean | 'partial'>
  }>
}

export interface VizTimelineConfig {
  type: 'timeline'
  items: (ctx: import('./compute').ComputeContext) => Array<{
    title: string
    description?: string
    date?: string
    status?: 'done' | 'current' | 'upcoming'
    icon?: string
  }>
}

// --- Dashboard Layout ---

export interface DashboardTabDef {
  id: string
  label: string
  icon?: string
  badge?: (ctx: import('./compute').ComputeContext) => { label: string; color: string } | null
  rows: LayoutRow[]
}

export interface DashboardLayout {
  rows?: LayoutRow[]
  tabs?: DashboardTabDef[]
}

export interface LayoutRow {
  cols: 1 | 2 | 3 | 4
  gap?: number
  items: LayoutItem[]
}

export interface InlineTabDef {
  id: string
  label: string
  icon?: string
  items: LayoutItem[]
}

export type LayoutItem =
  | { type: 'form'; sectionIndex?: number; span?: number }
  | { type: 'stats'; resultIndex: number; span?: number }
  | { type: 'viz'; vizIndex: number; span?: number }
  | { type: 'card'; cardIndex: number; span?: number }
  | { type: 'collection'; collectionKey: string; view: 'list' | 'table'; span?: number }
  | { type: 'section'; title: string; items: LayoutItem[]; span?: number }
  | { type: 'tabs'; tabs: InlineTabDef[]; span?: number }
